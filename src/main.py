import configparser
import discord
from discord.ext import commands
import yt_dlp
from os import getenv
import asyncio

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

# Dictionary to store song queues for each server (guild)
# Format: { guild_id: [url1, url2, ...] }
queues = {}

async def play_next_song(ctx):
    """
    A helper function that plays the next song in the queue for a given context's guild.
    This function is called recursively by the 'after' parameter in voice_client.play().
    """
    guild_id = ctx.guild.id
    if guild_id in queues and queues[guild_id]:
        # Get the next song URL from the front of the queue
        url = queues[guild_id].pop(0)
        
        # --- Audio fetching and playing logic ---
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
                audio_url = info['url']
                title = info.get('title', 'Unknown Title')

            ffmpeg_options = {
                'options': '-vn'  # no video
            }

            source = await discord.FFmpegOpusAudio.from_probe(audio_url, **ffmpeg_options)
            
            # The 'after' callback schedules this same function to run again, playing the next song
            ctx.voice_client.play(source, after=lambda e: asyncio.run_coroutine_threadsafe(play_next_song(ctx), bot.loop))
            
            await ctx.send(f"🎶 Now playing: **{title}**")

        except Exception as e:
            print(f"Error playing song: {e}")
            await ctx.send(f"An error occurred while trying to play the song. Skipping.")
            # If an error occurs, try to play the next song in the queue
            await play_next_song(ctx)

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
    """Plays audio from a YouTube link or adds it to the queue."""
    voice_client = ctx.voice_client
    if voice_client is None:
        await ctx.send("I'm not in a voice channel! Use `!join` first.")
        return

    guild_id = ctx.guild.id
    
    # Get or create the queue for this guild
    guild_queue = queues.setdefault(guild_id, [])
    guild_queue.append(url)

    if not voice_client.is_playing():
        # If nothing is playing, start the player
        await play_next_song(ctx)
    else:
        # If something is already playing, just confirm the song was added
        await ctx.send(f"👍 Added to queue!")


@bot.command()
async def skip(ctx):
    """Skips to the next song in the queue."""
    voice_client = ctx.voice_client
    if voice_client and voice_client.is_playing():
        # Stopping the current song will trigger the 'after' callback,
        # which in turn calls play_next_song() to play the next item.
        voice_client.stop()
        await ctx.send("⏭️ Skipped!")
    else:
        await ctx.send("I'm not playing anything to skip.")


@bot.command()
async def leave(ctx):
    """Leaves the current voice channel and clears the queue."""
    voice_client = ctx.voice_client
    if voice_client is not None:
        # Clear the queue for this guild before leaving
        if ctx.guild.id in queues:
            queues.pop(ctx.guild.id)
            
        await voice_client.disconnect()
        await ctx.send("👋 Left the voice channel.")
    else:
        await ctx.send("I'm not in a voice channel!")

bot.run(TOKEN)
