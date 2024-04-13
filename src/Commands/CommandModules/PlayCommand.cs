using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;

namespace Velody
{
    public class PlayCommand(ServerManager serverManager) : ApplicationCommandModule
    {

        private readonly ServerManager _serverManager = serverManager;

        [SlashCommand("play", "Plays a song.")]
        public async Task Play(InteractionContext ctx, [Option("video", "video to play")] string searchString)
        {

            Server? server = _serverManager.GetServer(ctx.Guild.Id);

            if (server == null)
            {
                await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("Something went wrong getting the server."));
                return;
            }

            DiscordVoiceState? voiceState = ctx.Member.VoiceState;
            DiscordChannel? channel = voiceState?.Channel;
            if (channel == null)
            {
                await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("You need to be in a voice channel."));
                return;
            }

            // If not connected to voice, join the channel
            if (!server.VoiceManager.IsConnectedToVoice())
            {
                try
                {
                    await server.VoiceManager.JoinVoiceChannelAsync(channel);
                }
                catch (Exception e)
                {
                    await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent(e.Message));
                    return;
                }
            }

            VideoHandler youtubeHandler = new VideoHandler(VideoService.Youtube);
            VideoInfo[] videos = await youtubeHandler.GetVideoInfo(searchString);

            if (videos.Length == 0)
            {
                await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("No videos found."));
                return;
            }

            await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent($"Playing {videos[0].Title}"));

            string videoPath = await youtubeHandler.DownloadVideoAsync(videos[0].Url);

            // Play the audio
            _ = server.VoiceManager.PlayAudioAsync(videoPath);



        }
    }
}
