import asyncio
import configparser
import logging
from dataclasses import dataclass
from typing import List, Optional
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
    url: str
    title: str
    source_url: str
    webpage_url: str


# ------------------ Embed Factory ------------------

class EmbedFactory:
    @staticmethod
    def base(title: str, desc: str, color: int = 0x5865F2, url: Optional[str] = None) -> discord.Embed:
        embed = discord.Embed(title=title, description=desc, color=color)
        if url:
            embed.url = url
        return embed

    @staticmethod
    def error(msg: str) -> discord.Embed:
        return discord.Embed(title="❌ Error", description=msg, color=0xED4245)

    @staticmethod
    def now_playing(song: Song) -> discord.Embed:
        embed = discord.Embed(
            title="🎶 Now Playing",
            description=f"**[{song.title}]({song.webpage_url})**",
            color=0x57F287,
        )
        embed.set_footer(text="Enjoy the music!")
        return embed

    @staticmethod
    def added_to_queue(song: Song, position: int) -> discord.Embed:
        return discord.Embed(
            title="➕ Added to Queue",
            description=f"**[{song.title}]({song.webpage_url})**\nPosition: `{position}`",
            color=0xFEE75C,
        )

    @staticmethod
    def queue(queue: List[Song]) -> discord.Embed:
        if not queue:
            return EmbedFactory.base("📜 Queue", "The queue is empty.")
        lines = [f"`{i+1}.` [{s.title}]({s.webpage_url})" for i, s in enumerate(queue[:10])]
        embed = EmbedFactory.base("📜 Music Queue", "\n".join(lines))
        if len(queue) > 10:
            embed.set_footer(text=f"+ {len(queue) - 10} more songs")
        return embed


# ------------------ YouTube Downloader Service ------------------

class YTDLService:
    def __init__(self):
        self.ydl_opts = {
            "format": "bestaudio/best",
            "quiet": True,
            "default_search": "auto",
            "extract_flat": False,
        }

    def canonicalize_url(self, url: str) -> str:
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
        url = self.canonicalize_url(query)

        def _extract():
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
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def ensure_voice(self, ctx: commands.Context) -> Optional[discord.VoiceClient]:
        if ctx.voice_client and ctx.voice_client.is_connected():
            return ctx.voice_client
        if not ctx.author.voice or not ctx.author.voice.channel:
            await ctx.send(embed=EmbedFactory.error("You must be in a voice channel to use this command."))
            return None
        channel = ctx.author.voice.channel
        vc = await channel.connect(self_deaf=True)
        await ctx.send(embed=EmbedFactory.base("🔊 Joined Voice Channel", f"Joined **{channel.name}**"))
        return vc

    async def disconnect(self, ctx: commands.Context):
        if ctx.voice_client:
            await ctx.voice_client.disconnect()
            await ctx.send(embed=EmbedFactory.base("👋 Disconnected", "Left the voice channel."))


# ------------------ Music Bot ------------------

class MusicBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="!", intents=intents)
        self.queue: List[Song] = []
        self.ytdl = YTDLService()
        self.voice = VoiceManager(self)

    async def play_next(self, ctx: commands.Context):
        if not self.queue:
            await ctx.send(embed=EmbedFactory.base("✅ Queue Finished", "No more songs. Leaving channel."))
            await self.voice.disconnect(ctx)
            return
        next_song = self.queue.pop(0)
        await self.play_song(ctx, next_song)

    async def play_song(self, ctx: commands.Context, song: Song):
        vc = ctx.voice_client or await self.voice.ensure_voice(ctx)
        if not vc:
            return
        ffmpeg_options = {"options": "-vn"}
        try:
            source = await discord.FFmpegOpusAudio.from_probe(song.source_url, **ffmpeg_options)

            def after_play(error):
                if error:
                    logging.error(f"Error after playing: {error}")
                asyncio.run_coroutine_threadsafe(self.play_next(ctx), self.loop)

            vc.play(source, after=after_play)
            await ctx.send(embed=EmbedFactory.now_playing(song))
        except Exception as e:
            logging.exception("Failed to play song")
            await ctx.send(embed=EmbedFactory.error("An error occurred while trying to play this song."))
            await self.play_next(ctx)


bot = MusicBot()


# ------------------ Events ------------------

@bot.event
async def on_ready():
    logging.info(f"✅ Logged in as {bot.user}")
    activity = discord.Game(name="🎵 !play <song or URL>")
    await bot.change_presence(status=discord.Status.online, activity=activity)


# ------------------ Commands ------------------

@bot.command(name="join")
async def join_cmd(ctx: commands.Context):
    await bot.voice.ensure_voice(ctx)


@bot.command(name="play")
async def play_cmd(ctx: commands.Context, *, query: str):
    vc = ctx.voice_client or await bot.voice.ensure_voice(ctx)
    if not vc:
        return
    try:
        song = await bot.ytdl.extract_info(query)
    except Exception:
        logging.exception("Error extracting media info")
        await ctx.send(embed=EmbedFactory.error("Could not extract info from the provided URL or search term."))
        return
    if vc.is_playing() or vc.is_paused():
        bot.queue.append(song)
        await ctx.send(embed=EmbedFactory.added_to_queue(song, len(bot.queue)))
    else:
        await bot.play_song(ctx, song)


@bot.command(name="skip")
async def skip_cmd(ctx: commands.Context):
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send(embed=EmbedFactory.error("I'm not connected to a voice channel."))
        return
    if vc.is_playing():
        vc.stop()
        await ctx.send(embed=EmbedFactory.base("⏭️ Skipped", "Skipped the current track."))
    else:
        await ctx.send(embed=EmbedFactory.error("Nothing is playing right now."))


@bot.command(name="pause")
async def pause_cmd(ctx: commands.Context):
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send(embed=EmbedFactory.error("Not connected to a voice channel."))
        return
    if vc.is_playing():
        vc.pause()
        await ctx.send(embed=EmbedFactory.base("⏸️ Paused", "Playback paused."))
    else:
        await ctx.send(embed=EmbedFactory.error("Nothing playing to pause."))


@bot.command(name="resume")
async def resume_cmd(ctx: commands.Context):
    vc = ctx.voice_client
    if not vc or not vc.is_connected():
        await ctx.send(embed=EmbedFactory.error("Not connected to a voice channel."))
        return
    if vc.is_paused():
        vc.resume()
        await ctx.send(embed=EmbedFactory.base("▶️ Resumed", "Playback resumed."))
    else:
        await ctx.send(embed=EmbedFactory.error("Nothing is paused."))


@bot.command(name="queue")
async def queue_cmd(ctx: commands.Context):
    await ctx.send(embed=EmbedFactory.queue(bot.queue))


@bot.command(name="nowplaying")
async def nowplaying_cmd(ctx: commands.Context):
    vc = ctx.voice_client
    if vc and vc.is_playing():
        await ctx.send(embed=EmbedFactory.base("🎵 Now Playing", "Currently streaming audio."))
    else:
        await ctx.send(embed=EmbedFactory.error("Nothing is currently playing."))


@bot.command(name="leave")
async def leave_cmd(ctx: commands.Context):
    bot.queue.clear()
    await bot.voice.disconnect(ctx)


# ------------------ Run ------------------

bot.run(TOKEN)
