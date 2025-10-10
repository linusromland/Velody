import configparser
import logging
from typing import List, Optional
import discord
from discord.ext import commands
import yt_dlp
from os import getenv

# Read token from config.ini
config = configparser.ConfigParser()
config.read("config.ini")
TOKEN: Optional[str] = config.get("discord", "token", fallback=getenv("DISCORD_TOKEN"))
if not TOKEN:
    raise RuntimeError("Discord token not found in config.ini or environment variable.")

intents = discord.Intents.default()
intents.message_content = True  # needed for text commands
bot = commands.Bot(command_prefix="!", intents=intents)

song_queue: List[str] = []
logging.basicConfig(level=logging.INFO)


async def ensure_voice(ctx: commands.Context) -> Optional[discord.VoiceClient]:
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


async def play_next(ctx: commands.Context) -> None:
    """Plays the next song in the queue or leaves if none remain."""
    if song_queue:
        next_url = song_queue.pop(0)
        await play_song(ctx, next_url)
    else:
        # Leave if queue is empty
        if ctx.voice_client:
            await ctx.send("✅ Queue is empty. Leaving voice channel.")
            await ctx.voice_client.disconnect()


async def play_song(ctx: commands.Context, url: str) -> None:
    """Plays a song from a given URL in the voice channel."""
    voice_client = ctx.voice_client or await ensure_voice(ctx)
    if not voice_client:
        return

    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'default_search': 'auto',
        'extract_flat': 'in_playlist',
    }

    # Sanitize URL to remove playlist parameters
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    for param in ['list', 'start_radio', 'index', 'playlist', 'playnext', 'feature', 'si']:
        qs.pop(param, None)
    new_query = urlencode(qs, doseq=True)
    sanitized_url = urlunparse(parsed._replace(query=new_query))

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(sanitized_url, download=False)
            if 'url' not in info:
                raise ValueError("No audio URL found.")
            audio_url = info['url']
            title = info.get('title', 'Unknown Title')

        ffmpeg_options = {'options': '-vn'}
        source = await discord.FFmpegOpusAudio.from_probe(audio_url, **ffmpeg_options)

        def after_play(error):
            if error:
                logging.error(f"Error after playing: {error}")
            bot.loop.create_task(play_next(ctx))

        voice_client.play(source, after=after_play)
        await ctx.send(f"🎶 Now playing: **{title}**")

    except Exception as e:
        logging.error(f"Error playing song: {e}")
        await ctx.send("❌ An error occurred while trying to play this song.")
        await play_next(ctx)


@bot.event
async def on_ready() -> None:
    logging.info(f"✅ Logged in as {bot.user}")


@bot.command()
async def join(ctx: commands.Context) -> None:
    """Joins the voice channel the user is in."""
    await ensure_voice(ctx)


@bot.command()
async def play(ctx: commands.Context, *, url: str) -> None:
    """Plays audio from a link or adds it to the queue."""
    voice_client = ctx.voice_client or await ensure_voice(ctx)
    if not voice_client:
        return

    if voice_client.is_playing() or voice_client.is_paused():
        song_queue.append(url)
        await ctx.send(f"👍 Added to queue: `{url}`")
    else:
        await play_song(ctx, url)


@bot.command()
async def leave(ctx: commands.Context) -> None:
    """Leaves the current voice channel and clears the queue."""
    global song_queue
    voice_client = ctx.voice_client
    if voice_client:
        song_queue.clear()
        await voice_client.disconnect()
        await ctx.send("👋 Left the voice channel and cleared the queue.")
    else:
        await ctx.send("I'm not in a voice channel!")


bot.run(TOKEN)
