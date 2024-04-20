using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;
using Serilog;
using static Velody.VoiceManager;

namespace Velody
{
    public class PlayCommand(ServerManager serverManager, VideoHandler videoHandler) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("PlayCommand");
        private readonly ServerManager _serverManager = serverManager;
        private readonly VideoHandler _videoHandler = videoHandler;

        [SlashCommand("play", "Plays a video with the given search string or URL.")]
        public async Task Play(InteractionContext ctx, [Option("video", "video to play")] string searchString)
        {
            EmbedBuilder embed = new EmbedBuilder(ctx);
            try
            {
                Server? server = _serverManager.GetServer(ctx.Guild.Id);

                if (server == null)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("An error occurred while trying to get the server.");
                    await embed.Send();
                    return;
                }

                DiscordChannel? voiceChannel = VoiceManager.GetVoiceChannel(ctx.Member.VoiceState);
                if (voiceChannel == null)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("You need to be in a voice channel to use this command.");
                    await embed.Send();
                    return;
                }

                JoinVoiceResponse joinResponse = await server.VoiceManager.JoinVoiceChannelAsync(voiceChannel);

                if (joinResponse.Code == JoinVoiceChannelResponseCode.UnknownError)
                {
                    await embed.SendUnkownErrorAsync();
                    return;
                }
                string GuildId = ctx.Guild.Id.ToString();
                string UserId = ctx.User.Id.ToString();
                // TODO: add support here to not always be youtube (Default should still be youtube though)
                VideoInfo[] videos = await _videoHandler.GetVideoInfo(VideoService.Youtube, searchString, GuildId, UserId);

                if (videos.Length == 0)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription($"No videos found for: {searchString}");
                    await embed.Send();
                    return;
                }

                VideoInfo video = videos[0];
                embed.WithTitle($"Playing `{video.Title}`");
                if (video.Thumbnail != null)
                {
                    embed.WithImage(video.Thumbnail);
                }
                await embed.Send();
                await server.Queue.AddToQueueAsync(video);
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the play command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }
    }
}
