"""
Velody — A modern Discord music bot using discord.py 2.x and yt-dlp.

This bot provides slash commands for playing, pausing, resuming,
and managing music queues in Discord voice channels.
"""

import asyncio
import configparser
import logging
from dataclasses import dataclass
from os import getenv
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, parse_qs

import discord
from discord import app_commands
from discord.ext import commands
import yt_dlp

# ------------------ Logging ------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("Velody")

# ------------------ Configuration ------------------

config = configparser.ConfigParser()
config.read("config.ini")

TOKEN: Optional[str] = config.get("discord", "token", fallback=getenv("DISCORD_TOKEN"))
if not TOKEN:
    raise RuntimeError("Discord token not found in config.ini or environment variable.")

intents = discord.Intents.default()
intents.message_content = False  # Not needed for slash commands


# ------------------ Data Classes ------------------


@dataclass
class Song:
    """Represents a song with metadata and URLs."""

    url: str
    title: str
    source_url: str
    webpage_url: str
    thumbnail: Optional[str] = None


# ------------------ Embed Factory ------------------


class EmbedFactory:
    """Factory class for creating consistent Discord embeds."""

    @staticmethod
    def base(title: str, desc: str, color: int = 0x5865F2, url: Optional[str] = None) -> discord.Embed:
        """
        Create a base embed with an optional URL.

        Args:
            title: The embed title.
            desc: The embed description.
            color: The embed color (default: Discord blurple).
            url: Optional URL to attach to the title.

        Returns:
            A configured `discord.Embed` object.
        """
        embed = discord.Embed(title=title, description=desc, color=color)
        if url:
            embed.url = url
        return embed

    @staticmethod
    def error(msg: str) -> discord.Embed:
        """Return a red error embed with the provided message."""
        return discord.Embed(title="❌ Error", description=msg, color=0xED4245)

    @staticmethod
    def now_playing(song: Song) -> discord.Embed:
        """Return an embed representing the currently playing song."""
        embed = discord.Embed(
            title="🎶 Now Playing",
            description=f"**[{song.title}]({song.webpage_url})**",
            color=0x57F287,
        )
        if song.thumbnail:
            embed.set_thumbnail(url=song.thumbnail)
        embed.set_footer(text="Enjoy the music!")
        return embed

    @staticmethod
    def added_to_queue(song: Song, position: int) -> discord.Embed:
        """Return an embed showing a song added to the queue."""
        embed = discord.Embed(
            title="➕ Added to Queue",
            description=f"**[{song.title}]({song.webpage_url})**\nPosition: `{position}`",
            color=0xFEE75C,
        )
        if song.thumbnail:
            embed.set_thumbnail(url=song.thumbnail)
        return embed

    @staticmethod
    def queue(queue: List[Song]) -> discord.Embed:
        """Return an embed displaying the current song queue."""
        if not queue:
            return EmbedFactory.base("📜 Queue", "The queue is empty.")
        lines = [f"`{i+1}.` [{s.title}]({s.webpage_url})" for i, s in enumerate(queue[:10])]
        embed = EmbedFactory.base("📜 Music Queue", "\n".join(lines))
        if len(queue) > 10:
            embed.set_footer(text=f"+ {len(queue) - 10} more songs")
        if queue[0].thumbnail:
            embed.set_thumbnail(url=queue[0].thumbnail)
        return embed


# ------------------ YouTube Downloader Service ------------------


class YTDLService:
    """Service class for extracting audio information from YouTube and other sources."""

    def __init__(self) -> None:
        """Initialize the YTDLService with default yt-dlp options."""
        self.ydl_opts: Dict[str, Any] = {
            "format": "bestaudio/best",
            "quiet": True,
            "default_search": "auto",
            "extract_flat": False,
        }

    def canonicalize_url(self, url: str) -> str:
        """
        Normalize YouTube URLs for consistent handling.

        Args:
            url: The original YouTube or shortened URL.

        Returns:
            A canonicalized YouTube watch URL.
        """
        parsed = urlparse(url)
        if parsed.netloc.endswith("youtube.com") and parsed.path == "/watch":
            video_id = parse_qs(parsed.query).get("v", [None])[0]
            if video_id:
                return f"https://www.youtube.com/watch?v={video_id}"
        elif parsed.netloc in ("youtu.be", "www.youtu.be"):
            video_id = parsed.path.strip("/")
            if video_id:
                return f"https://www.youtube.com/watch?v={video_id}"
        return url

    async def extract_info(self, query: str) -> Song:
        """
        Extract song information asynchronously using yt-dlp.

        Args:
            query: A YouTube URL or search term.

        Returns:
            A `Song` instance containing metadata and stream URLs.
        """
        url = self.canonicalize_url(query)

        def _extract() -> Dict[str, Any]:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        info = await asyncio.to_thread(_extract)
        entry = info["entries"][0] if "entries" in info and info["entries"] else info

        return Song(
            url=url,
            title=entry.get("title", "Unknown Title"),
            source_url=entry.get("url"),
            webpage_url=entry.get("webpage_url", url),
            thumbnail=entry.get("thumbnail"),
        )


# ------------------ Voice Manager ------------------


class VoiceManager:
    """Handles voice channel connection and disconnection logic."""

    async def ensure_voice(self, interaction: discord.Interaction) -> Optional[discord.VoiceClient]:
        """
        Ensure the bot is connected to the same voice channel as the user.

        Args:
            interaction: The Discord interaction invoking the command.

        Returns:
            The connected `discord.VoiceClient`, or `None` if connection fails.
        """
        if interaction.guild is None:
            await interaction.response.send_message(embed=EmbedFactory.error("This command must be used in a server."))
            return None

        vc = interaction.guild.voice_client
        if vc and vc.is_connected():
            return vc

        if not interaction.user.voice or not interaction.user.voice.channel:
            await interaction.response.send_message(embed=EmbedFactory.error("You must be in a voice channel."))
            return None

        channel = interaction.user.voice.channel
        vc = await channel.connect(self_deaf=True)
        return vc

    async def disconnect(self, interaction: discord.Interaction) -> None:
        """
        Disconnect the bot from a voice channel if connected.

        Args:
            interaction: The command interaction context.
        """
        if interaction.guild and interaction.guild.voice_client:
            await interaction.guild.voice_client.disconnect()


# ------------------ Music Cog ------------------


class MusicCog(commands.Cog):
    """Discord Cog handling music playback and queue management."""

    def __init__(self, discord_bot: commands.Bot) -> None:
        """Initialize the music cog."""
        self.bot = discord_bot
        self.queues: Dict[int, List[Song]] = {}
        self.ytdl = YTDLService()
        self.voice = VoiceManager()

    def get_queue(self, guild_id: int) -> List[Song]:
        """
        Retrieve the song queue for a specific guild.

        Args:
            guild_id: The guild ID.

        Returns:
            The song queue list.
        """
        if guild_id not in self.queues:
            self.queues[guild_id] = []
        return self.queues[guild_id]

    async def set_activity(self, song_title: Optional[str] = None) -> None:
        """
        Update the bot's Discord status.

        Args:
            song_title: Optional song title to display as 'Listening to ...'.
        """
        if song_title:
            await self.bot.change_presence(
                status=discord.Status.online,
                activity=discord.Activity(type=discord.ActivityType.listening, name=song_title),
            )
        else:
            await self.bot.change_presence(
                status=discord.Status.online,
                activity=discord.Game(name="/play <song or URL>"),
            )

    async def play_next(self, interaction: discord.Interaction) -> None:
        """
        Play the next song in the queue, or disconnect if queue is empty.

        Args:
            interaction: The interaction context.
        """
        queue = self.get_queue(interaction.guild.id)
        if not queue:
            await self.set_activity(None)
            await self.voice.disconnect(interaction)
            return

        next_song = queue.pop(0)
        await self.play_song(interaction, next_song, followup=True)

    async def play_song(self, interaction: discord.Interaction, song: Song, followup: bool = False) -> None:
        """
        Play a song in the user's voice channel.

        Args:
            interaction: The command interaction.
            song: The `Song` to play.
            followup: Whether to send the response as a follow-up message.
        """
        vc = interaction.guild.voice_client or await self.voice.ensure_voice(interaction)
        if not vc:
            return

        await self.set_activity(song.title)
        embed = EmbedFactory.now_playing(song)
        if followup:
            await interaction.followup.send(embed=embed)
        else:
            await interaction.response.send_message(embed=embed)

        ffmpeg_options = {"options": "-vn"}
        try:
            source = await discord.FFmpegOpusAudio.from_probe(song.source_url, **ffmpeg_options)

            def after_play(error: Optional[Exception]) -> None:
                if error:
                    logger.error("Error after playing: %s", error)
                asyncio.run_coroutine_threadsafe(self.play_next(interaction), self.bot.loop)

            vc.play(source, after=after_play)
        except Exception as err:
            logger.exception("Playback error: %s", err)
            await interaction.followup.send(embed=EmbedFactory.error("Playback failed. Skipping..."))
            await self.play_next(interaction)

    # ------------------ Slash Commands ------------------

    @app_commands.command(name="play", description="Play a song from a URL or search query.")
    async def play(self, interaction: discord.Interaction, query: str) -> None:
        """Play a song or add it to the queue."""
        vc = interaction.guild.voice_client or await self.voice.ensure_voice(interaction)
        if not vc:
            return

        await interaction.response.defer(thinking=True)

        try:
            song = await self.ytdl.extract_info(query)
        except Exception as err:
            logger.exception("Error extracting info: %s", err)
            await interaction.followup.send(embed=EmbedFactory.error("Failed to extract song info."))
            return

        queue = self.get_queue(interaction.guild.id)
        if vc.is_playing() or vc.is_paused():
            queue.append(song)
            await interaction.followup.send(embed=EmbedFactory.added_to_queue(song, len(queue)))
        else:
            await self.play_song(interaction, song, followup=True)

    @app_commands.command(name="skip", description="Skip the current song.")
    async def skip(self, interaction: discord.Interaction) -> None:
        """Skip the currently playing song."""
        vc = interaction.guild.voice_client
        if not vc or not vc.is_connected():
            await interaction.response.send_message(embed=EmbedFactory.error("Not connected to a voice channel."))
            return
        if vc.is_playing():
            vc.stop()
            await interaction.response.send_message(embed=EmbedFactory.base("⏭️ Skipped", "Skipped the current track."))
        else:
            await interaction.response.send_message(embed=EmbedFactory.error("Nothing is playing."))

    @app_commands.command(name="pause", description="Pause the current song.")
    async def pause(self, interaction: discord.Interaction) -> None:
        """Pause the currently playing song."""
        vc = interaction.guild.voice_client
        if not vc or not vc.is_connected():
            await interaction.response.send_message(embed=EmbedFactory.error("Not connected to a voice channel."))
            return
        if vc.is_playing():
            vc.pause()
            await interaction.response.send_message(embed=EmbedFactory.base("⏸️ Paused", "Playback paused."))
        else:
            await interaction.response.send_message(embed=EmbedFactory.error("Nothing is playing."))

    @app_commands.command(name="resume", description="Resume playback.")
    async def resume(self, interaction: discord.Interaction) -> None:
        """Resume playback if paused."""
        vc = interaction.guild.voice_client
        if not vc or not vc.is_connected():
            await interaction.response.send_message(embed=EmbedFactory.error("Not connected to a voice channel."))
            return
        if vc.is_paused():
            vc.resume()
            await interaction.response.send_message(embed=EmbedFactory.base("▶️ Resumed", "Playback resumed."))
        else:
            await interaction.response.send_message(embed=EmbedFactory.error("Nothing is paused."))

    @app_commands.command(name="queue", description="Show the current queue.")
    async def show_queue(self, interaction: discord.Interaction) -> None:
        """Display the current queue."""
        queue = self.get_queue(interaction.guild.id)
        await interaction.response.send_message(embed=EmbedFactory.queue(queue))

    @app_commands.command(name="leave", description="Disconnect and clear the queue.")
    async def leave(self, interaction: discord.Interaction) -> None:
        """Disconnect from voice and clear the song queue."""
        if interaction.guild:
            self.get_queue(interaction.guild.id).clear()
        await self.voice.disconnect(interaction)
        await self.set_activity(None)
        await interaction.response.send_message(embed=EmbedFactory.base("👋 Disconnected", "Left the voice channel."))

    @app_commands.command(name="about", description="About the bot.")
    async def about(self, interaction: discord.Interaction) -> None:
        """Display information about the bot."""
        embed = EmbedFactory.base(
            "🎧 Velody",
            "Modern Discord music bot powered by yt-dlp and discord.py 2.x.",
        )
        embed.set_footer(text="Check it out on GitHub!")
        embed.url = "https://github.com/linusromland/velody"
        await interaction.response.send_message(embed=embed)


# ------------------ Bot Setup ------------------


class VelodyBot(commands.Bot):
    """Main bot class for initializing and managing the Velody music bot."""

    def __init__(self) -> None:
        """Initialize the bot with intents and config options."""
        super().__init__(command_prefix="!", intents=intents)
        self.dev_guild_id: Optional[int] = config.getint("bot", "dev_guild_id", fallback=None)
        self.clear_dev_commands: bool = config.getboolean(
            "bot", "clear_dev_commands", fallback=False)

    async def setup_hook(self) -> None:
        """Load the music cog and synchronize slash commands."""
        await self.add_cog(MusicCog(self))

        if self.dev_guild_id:
            guild = discord.Object(id=self.dev_guild_id)
            logger.info("🧪 Development mode: syncing commands to guild %s", self.dev_guild_id)

            if self.clear_dev_commands:
                logger.info("🧹 Clearing previous dev guild commands...")
                self.tree.clear_commands(guild=guild)

            await self.tree.sync(guild=guild)
            logger.info("✅ Slash commands synced instantly to dev guild.")
        else:
            await self.tree.sync()
            logger.info("🌍 Slash commands globally synced (may take up to an hour).")

    async def on_ready(self) -> None:
        """Event handler for when the bot successfully logs in."""
        logger.info("✅ Logged in as %s (ID: %s)", self.user, self.user.id)
        await self.change_presence(
            status=discord.Status.online,
            activity=discord.Game(name="/play <song or URL>"),
        )


# ------------------ Run ------------------

if __name__ == "__main__":
    bot = VelodyBot()
    bot.run(TOKEN)
