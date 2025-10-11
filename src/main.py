"""
Velody - A Discord Music Bot

This module implements a Discord music bot that can play audio from YouTube
and other sources using yt-dlp and discord.py.
"""

import asyncio
import configparser
import logging
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from os import getenv
from urllib.parse import urlparse, parse_qs

import discord
from discord.ext import commands
import yt_dlp


# ------------------ Setup ------------------

logging.basicConfig(level=logging.INFO)
config = configparser.ConfigParser()
config.read("config.ini")

TOKEN: Optional[str] = config.get("discord", "token", fallback=getenv("DISCORD_TOKEN"))
if not TOKEN:
    raise RuntimeError("Discord token not found in config.ini or environment variable.")

intents = discord.Intents.default()
intents.message_content = True


# ------------------ Data ------------------

@dataclass
class Song:
    """Represents a song with its metadata and URLs.
    
    Attributes:
        url: The original URL or search query
        title: The title of the song
        source_url: The direct audio stream URL
        webpage_url: The webpage URL for the song
    """
    url: str
    title: str
    source_url: str
    webpage_url: str


# ------------------ Embed Factory ------------------

class EmbedFactory:
    """Factory class for creating Discord embeds with consistent styling."""

    @staticmethod
    def base(title: str, desc: str, color: int = 0x5865F2, url: Optional[str] = None) -> discord.Embed:
        """Create a base embed with common styling.
        
        Args:
            title: The title of the embed
            desc: The description text
            color: The color of the embed (default: Discord blurple)
            url: Optional URL to link the embed title to
            
        Returns:
            A configured Discord embed
        """
        embed = discord.Embed(title=title, description=desc, color=color)
        if url:
            embed.url = url
        return embed

    @staticmethod
    def error(msg: str) -> discord.Embed:
        """Create an error embed with red styling.
        
        Args:
            msg: The error message to display
            
        Returns:
            A red-colored error embed
        """
        return discord.Embed(title="❌ Error", description=msg, color=0xED4245)

    @staticmethod
    def now_playing(song: Song) -> discord.Embed:
        """Create a 'now playing' embed for a song.
        
        Args:
            song: The song currently being played
            
        Returns:
            A green-colored embed showing the current song
        """
        embed = discord.Embed(
            title="🎶 Now Playing",
            description=f"**[{song.title}]({song.webpage_url})**",
            color=0x57F287,
        )
        embed.set_footer(text="Enjoy the music!")
        return embed

    @staticmethod
    def added_to_queue(song: Song, position: int) -> discord.Embed:
        """Create an embed for when a song is added to the queue.
        
        Args:
            song: The song that was added to the queue
            position: The position in the queue
            
        Returns:
            A yellow-colored embed confirming the song was queued
        """
        return discord.Embed(
            title="➕ Added to Queue",
            description=f"**[{song.title}]({song.webpage_url})**\nPosition: `{position}`",
            color=0xFEE75C,
        )

    @staticmethod
    def queue(queue: List[Song]) -> discord.Embed:
        """Create an embed displaying the current queue.
        
        Args:
            queue: List of songs in the queue
            
        Returns:
            An embed showing the queue contents (up to 10 songs)
        """
        if not queue:
            return EmbedFactory.base("📜 Queue", "The queue is empty.")
        lines = [f"`{i+1}.` [{s.title}]({s.webpage_url})" for i, s in enumerate(queue[:10])]
        embed = EmbedFactory.base("📜 Music Queue", "\n".join(lines))
        if len(queue) > 10:
            embed.set_footer(text=f"+ {len(queue) - 10} more songs")
        return embed


# ------------------ YouTube Downloader Service ------------------

class YTDLService:
    """Service for extracting audio information from YouTube and other sources."""

    def __init__(self) -> None:
        """Initialize the YTDLService with default options."""
        self.ydl_opts: Dict[str, Any] = {
            "format": "bestaudio/best",
            "quiet": True,
            "default_search": "auto",
            "extract_flat": False,
        }

    def canonicalize_url(self, url: str) -> str:
        """Convert various YouTube URL formats to a canonical format.
        
        Args:
            url: The URL to canonicalize
            
        Returns:
            A canonical YouTube URL or the original URL if not a YouTube link
        """
        parsed = urlparse(url)
        if parsed.netloc.endswith("youtube.com") and parsed.path == "/watch":
            qs = parse_qs(parsed.query)
            video_id = qs.get("v", [None])[0]
            if video_id:
                return f"https://www.youtube.com/watch?v={video_id}"
        elif parsed.netloc in ("youtu.be", "www.youtu.be"):
            video_id = parsed.path.strip("/")
            if video_id:
                return f"https://www.youtube.com/watch?v={video_id}"
        return url  # fallback for search terms or other sources

    async def extract_info(self, query: str) -> Song:
        """Extract song information from a URL or search query.
        
        Args:
            query: URL or search term to extract info from
            
        Returns:
            A Song object with extracted metadata
            
        Raises:
            ValueError: If no audio source is found
            yt_dlp.DownloadError: If extraction fails
        """
        url = self.canonicalize_url(query)

        def _extract() -> Dict[str, Any]:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        info = await asyncio.to_thread(_extract)
        entry = info["entries"][0] if "entries" in info and info["entries"] else info

        source_url = entry.get("url")
        title = entry.get("title", "Unknown Title")
        webpage_url = entry.get("webpage_url", url)
        if not source_url:
            raise ValueError("No audio source found")

        return Song(url=url, title=title, source_url=source_url, webpage_url=webpage_url)


# ------------------ Voice Manager ------------------

class VoiceManager:
    """Manages voice channel connections and interactions."""

    def __init__(self, bot: commands.Bot) -> None:
        """Initialize the VoiceManager.
        
        Args:
            bot: The bot instance to manage voice for
        """
        self.bot = bot

    async def ensure_voice(self, ctx: commands.Context) -> Optional[discord.VoiceClient]:
        """Ensure the bot is connected to a voice channel.
        
        Args:
            ctx: The command context
            
        Returns:
            The voice client if connected, None if unable to connect
        """
        if ctx.voice_client and ctx.voice_client.is_connected():
            return ctx.voice_client
        if not ctx.author.voice or not ctx.author.voice.channel:
            await ctx.send(
                embed=EmbedFactory.error(
                    "You must be in a voice channel "
                    "to use this command."
                )
            )
            return None
        channel = ctx.author.voice.channel
        vc = await channel.connect(self_deaf=True)
        await ctx.send(
            embed=EmbedFactory.base(
                "🔊 Joined Voice Channel",
                f"Joined **{channel.name}**"
            )
        )
        return vc

    async def disconnect(self, ctx: commands.Context) -> None:
        """Disconnect from the voice channel.
        
        Args:
            ctx: The command context
        """
        if ctx.voice_client:
            await ctx.voice_client.disconnect()
            await ctx.send(embed=EmbedFactory.base("👋 Disconnected", "Left the voice channel."))


# ------------------ Music Bot ------------------

class MusicBot(commands.Bot):
    """Main music bot class that handles music playback and queue management."""

    def __init__(self) -> None:
        """Initialize the MusicBot with required components."""
        super().__init__(command_prefix="!", intents=intents)
        self.queue: List[Song] = []
        self.ytdl = YTDLService()
        self.voice = VoiceManager(self)

    async def play_next(self, ctx: commands.Context) -> None:
        """Play the next song in the queue.
        
        Args:
            ctx: The command context
        """
        if not self.queue:
            await ctx.send(embed=EmbedFactory.base("✅ Queue Finished", "No more songs. Leaving channel."))
            await self.voice.disconnect(ctx)
            return
        next_song = self.queue.pop(0)
        await self.play_song(ctx, next_song)

    async def play_song(self, ctx: commands.Context, song: Song) -> None:
        """Play a specific song.
        
        Args:
            ctx: The command context
            song: The song to play
        """
        vc = ctx.voice_client or await self.voice.ensure_voice(ctx)
        if not vc:
            return
        ffmpeg_options = {"options": "-vn"}
        try:
            source = await discord.FFmpegOpusAudio.from_probe(song.source_url, **ffmpeg_options)

            def after_play(error: Optional[Exception]) -> None:
                if error:
                    logging.error(f"Error after playing: {error}")
                asyncio.run_coroutine_threadsafe(self.play_next(ctx), self.loop)

            vc.play(source, after=after_play)
        except Exception as e:
            logging.exception("Unexpected error while playing song: %s", e)
            await ctx.send(embed=EmbedFactory.error("An unexpected error occurred while trying to play this song."))
            await self.play_next(ctx)


music_bot = MusicBot()


# ------------------ Events ------------------

@music_bot.event
async def on_ready() -> None:
    """Event handler for when the bot is ready and connected."""
    logging.info(f"✅ Logged in as {music_bot.user}")
    activity = discord.Game(name="🎵 !play <song or URL>")
    await music_bot.change_presence(status=discord.Status.online, activity=activity)


# ------------------ Commands ------------------

@music_bot.command(name="join")
async def join_cmd(ctx: commands.Context) -> None:
    """Join the user's voice channel.
    
    Args:
        ctx: The command context
    """
    await music_bot.voice.ensure_voice(ctx)


@music_bot.command(name="play")
async def play_cmd(ctx: commands.Context, *, query: str) -> None:
    """Play a song from a URL or search query.
    
    Args:
        ctx: The command context
        query: URL or search term for the song to play
    """
    vc = ctx.voice_client or await music_bot.voice.ensure_voice(ctx)
    if not vc:
        return
    try:
        song = await music_bot.ytdl.extract_info(query)
    except (yt_dlp.DownloadError, ValueError) as e:
        logging.exception("Error extracting media info: %s", e)
        await ctx.send(embed=EmbedFactory.error("Couldn't extract info from the provided URL or search term"))
        return
    except Exception as e:
        logging.exception("Unexpected error during media extraction: %s", e)
        await ctx.send(embed=EmbedFactory.error("An unexpected error occurred while processing your request"))
        return

    if vc.is_playing() or vc.is_paused():
        music_bot.queue.append(song)
        await ctx.send(embed=EmbedFactory.added_to_queue(song, len(music_bot.queue)))
    else:
        await music_bot.play_song(ctx, song)


@music_bot.command(name="skip")
async def skip_cmd(ctx: commands.Context) -> None:
    """Skip the currently playing song.
    
    Args:
        ctx: The command context
    """
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send(embed=EmbedFactory.error("I'm not connected to a voice channel."))
        return
    if vc.is_playing():
        vc.stop()
        await ctx.send(embed=EmbedFactory.base("⏭️ Skipped", "Skipped the current track."))
    else:
        await ctx.send(embed=EmbedFactory.error("Nothing is playing right now."))


@music_bot.command(name="pause")
async def pause_cmd(ctx: commands.Context) -> None:
    """Pause the currently playing song.
    
    Args:
        ctx: The command context
    """
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send(embed=EmbedFactory.error("Not connected to a voice channel."))
        return
    if vc.is_playing():
        vc.pause()
        await ctx.send(embed=EmbedFactory.base("⏸️ Paused", "Playback paused."))
    else:
        await ctx.send(embed=EmbedFactory.error("Nothing playing to pause."))


@music_bot.command(name="resume")
async def resume_cmd(ctx: commands.Context) -> None:
    """Resume the paused song.
    
    Args:
        ctx: The command context
    """
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send(embed=EmbedFactory.error("Not connected to a voice channel."))
        return
    if vc.is_paused():
        vc.resume()
        await ctx.send(embed=EmbedFactory.base("▶️ Resumed", "Playback resumed."))
    else:
        await ctx.send(embed=EmbedFactory.error("Nothing is paused."))


@music_bot.command(name="queue")
async def queue_cmd(ctx: commands.Context) -> None:
    """Display the current music queue.
    
    Args:
        ctx: The command context
    """
    await ctx.send(embed=EmbedFactory.queue(music_bot.queue))


@music_bot.command(name="nowplaying")
async def nowplaying_cmd(ctx: commands.Context) -> None:
    """Show information about the currently playing song.
    
    Args:
        ctx: The command context
    """
    vc = ctx.voice_client
    if vc and vc.is_playing():
        await ctx.send(embed=EmbedFactory.base("🎵 Now Playing", "Currently streaming audio."))
    else:
        await ctx.send(embed=EmbedFactory.error("Nothing is currently playing."))


@music_bot.command(name="leave")
async def leave_cmd(ctx: commands.Context) -> None:
    """Leave the voice channel and clear the queue.
    
    Args:
        ctx: The command context
    """
    music_bot.queue.clear()
    await music_bot.voice.disconnect(ctx)


# ------------------ Run ------------------

if __name__ == "__main__":
    music_bot.run(TOKEN)
