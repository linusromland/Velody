"""
Velody — A modern Discord music bot using discord.py 2.x and yt-dlp.

Optimized version:
- Non-blocking yt-dlp extraction using asyncio.to_thread()
- Avoids redundant metadata lookups
- Adds caching for repeated URLs
- Sends immediate feedback on /play for better UX
"""

import asyncio
import configparser
import logging
import time
from dataclasses import dataclass
from os import getenv
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, parse_qs

import discord
from discord import FFmpegPCMAudio, app_commands
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
    """Represents a song with metadata and stream URLs."""

    url: str
    title: str
    source_url: str
    webpage_url: str
    thumbnail: Optional[str] = None
    duration: Optional[int] = None  # seconds


# ------------------ Embed Factory ------------------


class EmbedFactory:
    """Factory class for creating consistent Discord embeds."""

    @staticmethod
    def base(title: str, desc: str, color: int = 0x5865F2, url: Optional[str] = None) -> discord.Embed:
        """
        Create a base embed with optional title URL.

        Args:
            title: The embed title.
            desc: The embed description.
            color: Embed color (default: Discord blurple).
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
        """Return a red error embed."""
        return discord.Embed(title="❌ Error", description=msg, color=0xED4245)

    @staticmethod
    def now_playing(song: Song, progress_text: Optional[str] = None) -> discord.Embed:
        """Return an embed representing the currently playing song, with optional progress text."""
        desc = f"**[{song.title}]({song.webpage_url})**"
        if progress_text:
            desc += f"\n\n`{progress_text}`"
        embed = discord.Embed(title="🎶 Now Playing", description=desc, color=0x57F287)
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
    """Service for extracting song metadata and audio stream URLs using yt-dlp."""

    def __init__(self) -> None:
        """Initialize yt-dlp options and cache."""
        self.ydl_opts: Dict[str, Any] = {
            "format": "bestaudio/best",
            "quiet": True,
            "default_search": "auto",
            "extract_flat": False,
        }
        self.cache: Dict[str, Song] = {}

    def canonicalize_url(self, url: str) -> str:
        """
        Normalize YouTube URLs for consistent caching and lookup.

        Args:
            url: The original YouTube or shortened URL.

        Returns:
            Canonicalized YouTube watch URL.
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
        Asynchronously extract song metadata and stream URL.

        Args:
            query: A YouTube URL or search term.

        Returns:
            A `Song` instance containing metadata.
        """
        url = self.canonicalize_url(query)

        # Cached lookup
        if url in self.cache:
            logger.debug(f"Cache hit for {url}")
            return self.cache[url]

        logger.info(f"Fetching info for {url}")

        def _extract() -> Dict[str, Any]:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        info = await asyncio.to_thread(_extract)
        entry = info["entries"][0] if "entries" in info and info["entries"] else info

        song = Song(
            url=url,
            title=entry.get("title", "Unknown Title"),
            source_url=entry.get("url"),
            webpage_url=entry.get("webpage_url", url),
            thumbnail=entry.get("thumbnail"),
            duration=entry.get("duration"),
        )

        # Store in cache
        self.cache[url] = song
        return song


# ------------------ Voice Manager ------------------


class VoiceManager:
    """Handles connecting and disconnecting the bot from voice channels."""

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
        """Disconnect the bot from a voice channel if connected."""
        if interaction.guild and interaction.guild.voice_client:
            await interaction.guild.voice_client.disconnect()


# ------------------ Music Cog ------------------


YDL_OPTS = {
    "format": "bestaudio/best",
    "quiet": True,
    "default_search": "auto",
    "nocheckcertificate": True,
    "geo_bypass": True,
}

FFMPEG_OPTS = {
    "before_options": "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
    "options": "-vn",
}


class MusicCog(commands.Cog):
    """Discord Cog for managing music playback and queues."""

    def __init__(self, discord_bot: commands.Bot) -> None:
        """Initialize the music cog."""
        self.bot = discord_bot
        self.queues: Dict[int, List[Song]] = {}
        self.ytdl = YTDLService()
        self.voice = VoiceManager()

    def get_queue(self, guild_id: int) -> List[Song]:
        """Retrieve or create the song queue for a specific guild."""
        if guild_id not in self.queues:
            self.queues[guild_id] = []
        return self.queues[guild_id]

    async def set_activity(self, song_title: Optional[str] = None) -> None:
        """Update the bot’s Discord presence."""
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
        """Play the next song in the queue, or disconnect if empty."""
        queue = self.get_queue(interaction.guild.id)
        if not queue:
            await self.set_activity(None)
            await self.voice.disconnect(interaction)
            return

        next_song = queue.pop(0)
        await self.play_song(interaction, next_song)

    async def play_song(self, interaction: discord.Interaction, song: Song) -> None:
        """Play a song in the connected voice channel."""
        vc = interaction.guild.voice_client or await self.voice.ensure_voice(interaction)
        if not vc:
            return

        await self.set_activity(song.title)
        url = song.source_url

        source = FFmpegPCMAudio(url, **FFMPEG_OPTS)
        vc.current_song = song
        vc.start_time = time.time()

        def after_play(err):
            if err:
                logger.error("Playback error: %s", err)
            asyncio.run_coroutine_threadsafe(self.play_next(interaction), self.bot.loop)

        vc.play(source, after=after_play)

    # ------------------ Slash Commands ------------------

    @app_commands.command(name="play", description="Play a song from a URL or search query.")
    async def play(self, interaction: discord.Interaction, query: str) -> None:
        """Play a song or add it to the queue."""
        vc = interaction.guild.voice_client or await self.voice.ensure_voice(interaction)
        if not vc:
            return

        # Send instant feedback to user
        await interaction.response.send_message("⏳ Searching for your song...")
        msg = await interaction.original_response()

        try:
            song = await self.ytdl.extract_info(query)
        except Exception as err:
            logger.exception("Error extracting info: %s", err)
            await msg.edit(content=None, embed=EmbedFactory.error("Failed to extract song info."))
            return

        queue = self.get_queue(interaction.guild.id)
        if vc.is_playing() or vc.is_paused():
            queue.append(song)
            await msg.edit(content=None, embed=EmbedFactory.added_to_queue(song, len(queue)))
        else:
            await self.play_song(interaction, song)
            await msg.edit(content=None, embed=EmbedFactory.now_playing(song))

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
        """Display the current song queue."""
        queue = self.get_queue(interaction.guild.id)
        await interaction.response.send_message(embed=EmbedFactory.queue(queue))

    @app_commands.command(name="nowplaying", description="Show the currently playing song.")
    async def now_playing(self, interaction: discord.Interaction) -> None:
        """Display the currently playing song with playback progress."""
        vc = interaction.guild.voice_client
        if not vc or not vc.is_connected():
            await interaction.response.send_message(embed=EmbedFactory.error("Not connected to a voice channel."))
            return

        if not vc.is_playing() and not vc.is_paused():
            await interaction.response.send_message(embed=EmbedFactory.error("Nothing is currently playing."))
            return

        if not hasattr(vc, "current_song") or not vc.current_song:
            await interaction.response.send_message(embed=EmbedFactory.error("No track information available."))
            return

        song = vc.current_song
        elapsed = int(time.time() - getattr(vc, "start_time", time.time()))
        total = song.duration or 0

        def fmt_time(sec: int) -> str:
            m, s = divmod(sec, 60)
            return f"{m}:{s:02d}"

        if total > 0:
            progress = min(elapsed / total, 1)
            progress_text = f"{fmt_time(elapsed)} / {fmt_time(total)} ({int(progress * 100)}%)"
        else:
            progress_text = f"{fmt_time(elapsed)} elapsed"

        await interaction.response.send_message(embed=EmbedFactory.now_playing(song, progress_text))

    @app_commands.command(name="leave", description="Disconnect and clear the queue.")
    async def leave(self, interaction: discord.Interaction) -> None:
        """Disconnect from the voice channel and clear the queue."""
        if interaction.guild:
            self.get_queue(interaction.guild.id).clear()
        await self.voice.disconnect(interaction)
        await self.set_activity(None)
        await interaction.response.send_message(embed=EmbedFactory.base("👋 Disconnected", "Left the voice channel."))

    @app_commands.command(name="about", description="About the bot.")
    async def about(self, interaction: discord.Interaction) -> None:
        """Display bot information and GitHub link."""
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
        """Initialize the bot with intents and config."""
        super().__init__(command_prefix="!", intents=intents)
        self.dev_guild_id: Optional[int] = config.getint("bot", "dev_guild_id", fallback=None)
        self.clear_dev_commands: bool = config.getboolean(
            "bot", "clear_dev_commands", fallback=False
        )

    async def setup_hook(self) -> None:
        """Load cogs and sync slash commands."""
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
        """Triggered when the bot logs in successfully."""
        logger.info("✅ Logged in as %s (ID: %s)", self.user, self.user.id)
        await self.change_presence(
            status=discord.Status.online,
            activity=discord.Game(name="/play <song or URL>"),
        )


# ------------------ Run ------------------

if __name__ == "__main__":
    bot = VelodyBot()
    bot.run(TOKEN)
