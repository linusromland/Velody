using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;
using Serilog;
using Velody.MongoDBIntegration.Repositories;
using Velody.Server;
using Velody.Utils;
using Velody.Video;
using static Velody.Server.VoiceManager;

namespace Velody
{
    public class PlaySkipCommand(ServerManager serverManager, VideoHandler videoHandler, HistoryRepository historyRepository) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("PlaySkipCommand");
        private readonly ServerManager _serverManager = serverManager;
        private readonly VideoHandler _videoHandler = videoHandler;
        private readonly HistoryRepository _historyRepository = historyRepository;

        [SlashCommand("playSkip", "Search for a video and play it, skipping the current video.")]
        public async Task PlaySkip(InteractionContext ctx, [Option("video", "video to play")] string searchString)
        {
            EmbedBuilder embed = new EmbedBuilder(ctx);
            try
            {
                Server.Server? server = _serverManager.GetServer(ctx.Guild.Id);

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
                    _logger.Error("An unknown error occurred while trying to join the voice channel {VoiceChannelName} in guild {GuildName}", voiceChannel.Name, ctx.Guild.Name);
                    await embed.SendUnkownErrorAsync();
                    return;
                }
                string GuildId = ctx.Guild.Id.ToString();
                string UserId = ctx.User.Id.ToString();
                string ChannelId = ctx.Channel.Id.ToString();
                // TODO: add support here to not always be youtube (Default should still be youtube though)
                VideoInfo[] videos = await _videoHandler.GetVideoInfo(VideoService.Youtube, searchString, GuildId, UserId, ChannelId);

                if (videos.Length == 0)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription($"No videos found for: {searchString}");
                    await embed.Send();
                    return;
                }

                if (videos.Length > 1)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("Playlist's are not allowed with this command.");
                    await embed.Send();
                    return;
                }

                VideoInfo video = videos[0];
                VideoInfo? currentlyPlaying = server.Queue.CurrentlyPlaying;
                TimeSpan currentPlayTime = server.VoiceManager.GetPlaybackDuration();
                _ = server.Queue.AddToQueueAsync(video, true);

                embed.WithTitle($"Now playing: `{video.Title}`");

                if (currentlyPlaying != null)
                {
                    server.VoiceManager.StopAudio();
                    if (currentlyPlaying.HistoryId != null)
                    {
                        await _historyRepository.SkippedHistory(currentlyPlaying.HistoryId, currentPlayTime);
                    }
                    embed.WithDescription($"Skipped `{currentlyPlaying.Title}`");
                }

                if (video.Thumbnail != null)
                {
                    embed.WithImage(video.Thumbnail);
                }

                embed.WithURL(video.Url);

                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the playSkip command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }
    }
}
