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
    public class SkipCommand(ServerManager serverManager, HistoryRepository historyRepository) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("SkipCommand");

        private readonly ServerManager _serverManager = serverManager;

        private HistoryRepository _historyRepository = historyRepository;

        [SlashCommand("skip", "Skips the currently playing video.")]
        public async Task Play(InteractionContext ctx)
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

                VideoInfo? currentlyPlaying = server.Queue.CurrentlyPlaying;
                TimeSpan currentPlayTime = server.VoiceManager.GetPlaybackDuration();
                if (currentlyPlaying == null)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("There is no video currently playing.");
                    await embed.Send();
                    return;
                }

                VideoInfo? nextVideo = server.Queue.GetNextVideo;

                server.VoiceManager.StopAudio();
                if (currentlyPlaying.HistoryId != null)
                {
                    await _historyRepository.SkippedHistory(currentlyPlaying.HistoryId, currentPlayTime);
                }

                embed.WithTitle($"Skipped `{currentlyPlaying.Title}`");

                if (nextVideo != null)
                {
                    embed.WithDescription($"Up next `{nextVideo.Title}`");
                }

                await embed.Send();
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
