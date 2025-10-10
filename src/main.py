import configparser
import discord
from discord.ext import commands
import yt_dlp
from os import getenv

# Read token from config.ini
config = configparser.ConfigParser()
config.read("config.ini")
if "discord" in config and "token" in config["discord"]:
    TOKEN = config["discord"]["token"]
else:
    TOKEN = getenv("DISCORD_TOKEN")


intents = discord.Intents.default()
intents.message_content = True  # needed for text commands
bot = commands.Bot(command_prefix="!", intents=intents)

song_queue = []

async def play_next(ctx):
    """A helper function that checks the queue and plays the next song."""
    if song_queue:
        # Get the next URL from the front of the queue
        next_url = song_queue.pop(0)
        await play_song(ctx, next_url)

async def play_song(ctx, url: str):
    """A helper function that contains the core logic for playing a song."""
    voice_client = ctx.voice_client

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
    # Remove playlist-related params
    for param in ['list', 'start_radio', 'index', 'playlist', 'playnext', 'feature', 'si']:
        qs.pop(param, None)
    new_query = urlencode(qs, doseq=True)
    sanitized_url = urlunparse(parsed._replace(query=new_query))

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(sanitized_url, download=False)
            audio_url = info['url']
            title = info.get('title', 'Unknown Title')

        ffmpeg_options = {
            'options': '-vn'  # no video
        }

        source = await discord.FFmpegOpusAudio.from_probe(audio_url, **ffmpeg_options)
        # The 'after' callback now triggers the play_next function to handle the queue
        voice_client.play(source, after=lambda e: bot.loop.create_task(play_next(ctx)))
        await ctx.send(f"🎶 Now playing: **{title}**")

    except Exception as e:
        print(f"Error playing song: {e}")
        await ctx.send(f"❌ An error occurred while trying to play this song.")
        # If something goes wrong, try to play the next song in the queue
        await play_next(ctx)

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
        await channel.connect(self_deaf=True)

    await ctx.send(f"Joined **{channel}**!")

@bot.command()
async def play(ctx, *, url: str):
    """Plays audio from a link or adds it to the queue."""
    voice_client = ctx.voice_client
    if voice_client is None:
        await ctx.send("I'm not in a voice channel! Use `!join` first.")
        return

    # If the bot is already playing something, add the new song to the queue
    if voice_client.is_playing() or voice_client.is_paused():
        song_queue.append(url)
        await ctx.send(f"👍 Added to queue: `{url}`")
    else:
        # If nothing is playing, start playing the requested song immediately
        await play_song(ctx, url)


@bot.command()
async def leave(ctx):
    """Leaves the current voice channel and clears the queue."""
    global song_queue
    voice_client = ctx.voice_client
    if voice_client is not None:
        # Clear the queue when the bot leaves
        song_queue = []
        await voice_client.disconnect()
        await ctx.send("👋 Left the voice channel and cleared the queue.")
    else:
        await ctx.send("I'm not in a voice channel!")

bot.run(TOKEN)
