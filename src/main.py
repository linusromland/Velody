import configparser
import discord
from discord.ext import commands
import yt_dlp

# Read token from config.ini
config = configparser.ConfigParser()
config.read("config.ini")
TOKEN = config["discord"]["token"]


intents = discord.Intents.default()
intents.message_content = True  # needed for text commands
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user}")

@bot.command()
async def join(ctx):
    """Joins the voice channel the user is in."""
    if ctx.author.voice is None:
        await ctx.send("You're not in a voice channel!")
        return

    channel = ctx.author.voice.channel
    if ctx.voice_client is not None:
        await ctx.voice_client.move_to(channel)
    else:
        await channel.connect()

    await ctx.send(f"Joined **{channel}**!")

@bot.command()
async def play(ctx, *, url: str):
    """Plays audio from a YouTube link."""
    voice_client = ctx.voice_client
    if voice_client is None:
        await ctx.send("I'm not in a voice channel! Use `!join` first.")
        return

    # Stop current audio if playing
    if voice_client.is_playing():
        voice_client.stop()

    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'default_search': 'auto',
        'extract_flat': 'in_playlist',
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if 'entries' in info:
            # If it's a playlist, get the first video
            info = info['entries'][0]
        audio_url = info['url']

    ffmpeg_options = {
        'options': '-vn'  # no video
    }

    source = await discord.FFmpegOpusAudio.from_probe(audio_url, **ffmpeg_options)
    voice_client.play(source, after=lambda e: print(f"Playback finished: {e}"))
    await ctx.send(f"🎶 Now playing: **{info.get('title', 'Unknown Title')}**")


@bot.command()
async def leave(ctx):
    """Leaves the current voice channel."""
    voice_client = ctx.voice_client
    if voice_client is not None:
        await voice_client.disconnect()
        await ctx.send("👋 Left the voice channel.")
    else:
        await ctx.send("I'm not in a voice channel!")

bot.run(TOKEN)
