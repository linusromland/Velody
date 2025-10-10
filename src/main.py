"""Velody Discord music bot

Requirements:
- Python 3.10+
- ffmpeg available on PATH (used by discord.py to stream audio)
- Set your Discord bot token in `config.ini` under [discord] token or via the DISCORD_TOKEN env var

Commands implemented:
- !join - bot joins your voice channel
- !leave - bot leaves and clears the queue
- !play <url|search> - play or enqueue tracks (supports playlists)
- !skip - skip current track
- !pause - pause playback
- !resume - resume playback
- !queue - show upcoming tracks
- !nowplaying - show currently playing track
- !clear - clear the queue
"""

import asyncio
import configparser
import logging
from dataclasses import dataclass
from typing import List, Optional
import discord
from discord.ext import commands
import yt_dlp
from os import getenv
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

# Read token from config.ini or environment
config = configparser.ConfigParser()
config.read("config.ini")
TOKEN: Optional[str] = config.get("discord", "token", fallback=getenv("DISCORD_TOKEN"))
if not TOKEN:
    raise RuntimeError("Discord token not found in config.ini or environment variable.")

intents = discord.Intents.default()
intents.message_content = True  # needed for text commands
bot = commands.Bot(command_prefix="!", intents=intents)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("velody")


@dataclass
class Song:
    """Representation of a track to be played."""
    title: str
    source: str  # direct audio URL or path playable by ffmpeg
    requested_by: Optional[str] = None


# A simple FIFO queue protected by a lock for concurrent access
song_queue: List[Song] = []
queue_lock = asyncio.Lock()


async def sanitize_url(url: str) -> str:
    """Strip common playlist/query params so we don't accidentally play a playlist item repeatedly."""
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    for param in ["list", "start_radio", "index", "playlist", "playnext", "feature", "si"]:
        qs.pop(param, None)
    new_query = urlencode(qs, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


async def enqueue_from_query(query: str, requester: commands.MemberConverter) -> List[Song]:
    """Resolve a query (url or search) to one or more Song objects. Handles playlists.

    Returns the list of created Song objects (one for single tracks, many for playlists).
    """
    ydl_opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "default_search": "auto",
        # do not attempt to download; we just want metadata and direct URLs
        "extract_flat": False,
    }

    sanitized = await sanitize_url(query)
    songs: List[Song] = []

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(sanitized, download=False)

            # Playlist handling: info may contain 'entries'
            entries = info.get("entries") if isinstance(info, dict) else None
            if entries:
                for entry in entries:
                    # Some entries might be partial; try to extract full info
                    if not entry:
                        continue
                    # If entry has "url" and "title" use it directly, otherwise try to extract full
                    if "url" in entry and "title" in entry:
                        source = entry.get("url")
                        title = entry.get("title", "Unknown Title")
                    else:
                        # attempt to resolve entry fully
                        full = ydl.extract_info(entry.get("url") or entry.get("id"), download=False)
                        source = full.get("url")
                        title = full.get("title", "Unknown Title")
                    if source:
                        songs.append(Song(title=title, source=source, requested_by=getattr(requester, "display_name", None)))
            else:
                # Single track
                source = info.get("url")
                title = info.get("title", "Unknown Title")
                if not source:
                    raise RuntimeError("Could not resolve audio source for the provided query")
                songs.append(Song(title=title, source=source, requested_by=getattr(requester, "display_name", None)))

    except Exception as e:
        logger.exception("Error resolving query with yt_dlp")
        raise

    return songs


async def play_next(ctx: commands.Context) -> None:
    """Play the next song in the queue if present."""
    # Acquire lock so we mutate queue safely
    async with queue_lock:
        if not song_queue:
            return
        next_song = song_queue.pop(0)

    await _play_song(ctx, next_song)


async def _play_song(ctx: commands.Context, song: Song) -> None:
    """Internal: play a Song object on the voice client attached to ctx."""
    voice_client = ctx.voice_client
    if not voice_client:
        await ctx.send("I'm not in a voice channel! Use `!join` first.")
        return

    ffmpeg_options = {"options": "-vn"}

    try:
        source = await discord.FFmpegOpusAudio.from_probe(song.source, **ffmpeg_options)

        def _after_play(error):
            if error:
                logger.error("Playback error: %s", error)
            # schedule next track
            try:
                bot.loop.create_task(play_next(ctx))
            except Exception:
                logger.exception("Failed to schedule next track")

        voice_client.play(source, after=_after_play)
        await ctx.send(f"🎶 Now playing: **{song.title}** (requested by {song.requested_by})")

    except Exception:
        logger.exception("Failed to play song")
        await ctx.send("❌ Failed to play the requested track. Skipping to next.")
        await play_next(ctx)


@bot.event
async def on_ready() -> None:
    logger.info("✅ Logged in as %s", bot.user)


@bot.command(name="join")
async def cmd_join(ctx: commands.Context) -> None:
    """Join the voice channel the command author is in."""
    if not ctx.author or not getattr(ctx.author, "voice", None) or not ctx.author.voice.channel:
        await ctx.send("You're not in a voice channel!")
        return

    channel = ctx.author.voice.channel
    if ctx.voice_client:
        await ctx.voice_client.move_to(channel)
    else:
        await channel.connect(self_deaf=True)

    await ctx.send(f"Joined **{channel}**!")


@bot.command(name="leave")
async def cmd_leave(ctx: commands.Context) -> None:
    """Leave the voice channel and clear queue."""
    voice_client = ctx.voice_client
    if not voice_client:
        await ctx.send("I'm not in a voice channel!")
        return

    async with queue_lock:
        song_queue.clear()

    await voice_client.disconnect()
    await ctx.send("👋 Left the voice channel and cleared the queue.")


@bot.command(name="play")
async def cmd_play(ctx: commands.Context, *, query: str) -> None:
    """Play a track (or add to queue). Accepts URLs or search terms."""
    voice_client = ctx.voice_client
    if not voice_client:
        await ctx.send("I'm not in a voice channel! Use `!join` first.")
        return

    try:
        songs = await enqueue_from_query(query, ctx.author)
    except Exception:
        await ctx.send("❌ Could not find or resolve the given query.")
        return

    async with queue_lock:
        # If nothing is playing, start immediately with the first track
        if not (voice_client.is_playing() or voice_client.is_paused()):
            first = songs.pop(0)
            # enqueue remaining
            song_queue.extend(songs)
            await _play_song(ctx, first)
        else:
            song_queue.extend(songs)
            await ctx.send(f"✅ Added {len(songs)} item(s) to the queue.")


@bot.command(name="skip")
async def cmd_skip(ctx: commands.Context) -> None:
    """Skip the currently playing track."""
    voice_client = ctx.voice_client
    if not voice_client or not voice_client.is_playing():
        await ctx.send("There's nothing playing right now.")
        return

    voice_client.stop()
    await ctx.send("⏭️ Skipped the current track.")


@bot.command(name="pause")
async def cmd_pause(ctx: commands.Context) -> None:
    """Pause playback."""
    vc = ctx.voice_client
    if not vc or not vc.is_playing():
        await ctx.send("Nothing is playing.")
        return
    vc.pause()
    await ctx.send("⏸️ Paused.")


@bot.command(name="resume")
async def cmd_resume(ctx: commands.Context) -> None:
    """Resume playback."""
    vc = ctx.voice_client
    if not vc or not vc.is_paused():
        await ctx.send("Nothing is paused.")
        return
    vc.resume()
    await ctx.send("▶️ Resumed.")


@bot.command(name="queue")
async def cmd_queue(ctx: commands.Context) -> None:
    """Show queued tracks."""
    async with queue_lock:
        if not song_queue:
            await ctx.send("Queue is empty.")
            return
        lines = [f"{i+1}. {s.title} (requested by {s.requested_by})" for i, s in enumerate(song_queue[:20])]
    await ctx.send("📜 Upcoming:\n" + "\n".join(lines))


@bot.command(name="nowplaying")
async def cmd_nowplaying(ctx: commands.Context) -> None:
    """Show the currently playing track."""
    vc = ctx.voice_client
    if not vc or not vc.is_playing():
        await ctx.send("Nothing is playing right now.")
        return
    # There's no direct way to get the current Song from FFmpegOpusAudio, so show a generic message
    await ctx.send("🎧 A track is currently playing.")


@bot.command(name="clear")
async def cmd_clear(ctx: commands.Context) -> None:
    """Clear the queue."""
    async with queue_lock:
        song_queue.clear()
    await ctx.send("🧹 Cleared the queue.")


if __name__ == '__main__':
    bot.run(TOKEN)

