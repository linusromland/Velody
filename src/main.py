import asyncio
import configparser
import logging
from dataclasses import dataclass
from typing import List, Optional
from os import getenv
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

import discord
from discord.ext import commands
import yt_dlp

# Read token from config.ini or environment
config = configparser.ConfigParser()
config.read("config.ini")
TOKEN: Optional[str] = config.get("discord", "token", fallback=getenv("DISCORD_TOKEN"))
if not TOKEN:
    raise RuntimeError("Discord token not found in config.ini or environment variable.")

logging.basicConfig(level=logging.INFO)


@dataclass
class Song:
    url: str
    title: str
    source_url: str


class MusicBot(commands.Bot):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.queue: List[Song] = []
        self.ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'default_search': 'auto',
            # do not try to extract full playlist contents by default
            'extract_flat': False,
        }

    async def ensure_voice(self, ctx: commands.Context) -> Optional[discord.VoiceClient]:
        """Ensure the bot is connected to the user's voice channel."""
        if ctx.voice_client and ctx.voice_client.is_connected():
            return ctx.voice_client

        if not ctx.author.voice or not ctx.author.voice.channel:
            await ctx.send("You're not in a voice channel!")
            return None

        channel = ctx.author.voice.channel
        voice_client = await channel.connect(self_deaf=True)
        await ctx.send(f"🔊 Joined **{channel}** to play music!")
        return voice_client

    def sanitize_url(self, url: str) -> str:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        for param in ['list', 'start_radio', 'index', 'playlist', 'playnext', 'feature', 'si']:
            qs.pop(param, None)
        new_query = urlencode(qs, doseq=True)
        return urlunparse(parsed._replace(query=new_query))

    async def extract_info(self, url: str) -> Song:
        """Run yt_dlp extraction in a thread to avoid blocking the event loop."""
        sanitized = self.sanitize_url(url)

        def _extract():
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(sanitized, download=False)
                return info

        info = await asyncio.to_thread(_extract)

        # Handle playlists by taking the first entry
        if 'entries' in info and info['entries']:
            entry = info['entries'][0]
        else:
            entry = info

        source_url = entry.get('url') or entry.get('webpage_url')
        title = entry.get('title', 'Unknown Title')
        if not source_url:
            raise ValueError('No audio source found')

        return Song(url=url, title=title, source_url=source_url)

    async def play_next(self, ctx: commands.Context) -> None:
        if not self.queue:
            if ctx.voice_client:
                await ctx.send("✅ Queue is empty. Leaving voice channel.")
                await ctx.voice_client.disconnect()
            return

        next_song = self.queue.pop(0)
        await self._play_song(ctx, next_song)

    async def _play_song(self, ctx: commands.Context, song: Song) -> None:
        voice_client = ctx.voice_client or await self.ensure_voice(ctx)
        if not voice_client:
            return

        ffmpeg_options = {'options': '-vn'}

        try:
            source = await discord.FFmpegOpusAudio.from_probe(song.source_url, **ffmpeg_options)

            def _after(error):
                if error:
                    logging.error(f"Error after playing: {error}")
                # schedule next on the bot's event loop in a safe way
                coro = self.play_next(ctx)
                asyncio.run_coroutine_threadsafe(coro, self.loop)

            voice_client.play(source, after=_after)
            await ctx.send(f"🎶 Now playing: **{song.title}**")

        except Exception as e:
            logging.exception("Failed to play song")
            await ctx.send("❌ An error occurred while trying to play this song.")
            await self.play_next(ctx)


intents = discord.Intents.default()
intents.message_content = True
bot = MusicBot(command_prefix='!', intents=intents)


@bot.event
async def on_ready() -> None:
    logging.info(f"✅ Logged in as {bot.user}")


@bot.command(name='join')
async def join_cmd(ctx: commands.Context) -> None:
    await bot.ensure_voice(ctx)


@bot.command(name='play')
async def play_cmd(ctx: commands.Context, *, url: str) -> None:
    """Plays audio from a link or adds it to the queue."""
    voice_client = ctx.voice_client or await bot.ensure_voice(ctx)
    if not voice_client:
        return

    try:
        info = await bot.extract_info(url)
    except Exception as e:
        logging.exception("Error extracting info")
        await ctx.send("❌ Could not extract media info from the provided URL.")
        return

    song = info
    if voice_client.is_playing() or voice_client.is_paused():
        bot.queue.append(song)
        await ctx.send(f"➕ Queued: **{song.title}**")
    else:
        await bot._play_song(ctx, song)


@bot.command(name='skip')
async def skip_cmd(ctx: commands.Context) -> None:
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send("I'm not connected to a voice channel.")
        return

    if vc.is_playing():
        vc.stop()
        await ctx.send("⏭️ Skipped current track.")
    else:
        await ctx.send("Nothing is playing right now.")


@bot.command(name='pause')
async def pause_cmd(ctx: commands.Context) -> None:
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send("Not connected.")
        return
    if vc.is_playing():
        vc.pause()
        await ctx.send("⏸️ Paused.")
    else:
        await ctx.send("Nothing playing to pause.")


@bot.command(name='resume')
async def resume_cmd(ctx: commands.Context) -> None:
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send("Not connected.")
        return
    if vc.is_paused():
        vc.resume()
        await ctx.send("▶️ Resumed.")
    else:
        await ctx.send("Nothing is paused.")


@bot.command(name='queue')
async def queue_cmd(ctx: commands.Context) -> None:
    if not bot.queue:
        await ctx.send("The queue is empty.")
        return
    lines = [f"{i+1}. {s.title} ({s.url})" for i, s in enumerate(bot.queue[:10])]
    await ctx.send("📜 Queue:\n" + "\n".join(lines))


@bot.command(name='nowplaying')
async def nowplaying_cmd(ctx: commands.Context) -> None:
    vc = ctx.voice_client
    if vc and vc.is_playing():
        await ctx.send("🔊 Currently playing")
    else:
        await ctx.send("Nothing is playing right now.")


@bot.command(name='leave')
async def leave_cmd(ctx: commands.Context) -> None:
    voice_client = ctx.voice_client
    if voice_client:
        bot.queue.clear()
        await voice_client.disconnect()
        await ctx.send("👋 Left the voice channel and cleared the queue.")
    else:
        await ctx.send("I'm not in a voice channel!")


bot.run(TOKEN)
