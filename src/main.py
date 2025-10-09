import configparser
import discord
from discord.ext import commands

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
async def play(ctx):
    """Plays an audio file (must be local)."""
    voice_client = ctx.voice_client

    if voice_client is None:
        await ctx.send("I'm not in a voice channel! Use `!join` first.")
        return

    audio_source = discord.FFmpegPCMAudio("sound.mp3")
    if not voice_client.is_playing():
        voice_client.play(audio_source, after=lambda e: print(f"Playback finished: {e}"))
        await ctx.send("🎶 Now playing sound.mp3!")
    else:
        await ctx.send("Already playing something!")

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
