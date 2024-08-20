using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;
using Serilog;
using Velody.MongoDBIntegration.Repositories;
using Velody.Server;
using Velody.Utils;
using Velody.Video;

namespace Velody
{
    public class ClearQueueCommand(ServerManager serverManager, HistoryRepository historyRepository) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("ClearCommand");

        private readonly ServerManager _serverManager = serverManager;

        private HistoryRepository _historyRepository = historyRepository;

        [SlashCommand("clear", "Clear the current queue.")]
        public async Task ClearQueue(InteractionContext ctx)
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

                List<VideoInfo> queue = server.Queue.GetQueue();
                if (queue.Count <= 1)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("The queue is already empty.");
                    await embed.Send();
                    return;
                }
                server.Queue.ClearQueue();

                for (int i = 1; i < queue.Count; i++)
                {
                    VideoInfo video = queue[i];
                    if (video.HistoryId != null)
                    {
                        await _historyRepository.SkippedHistory(video.HistoryId, TimeSpan.Zero);
                    }
                }

                embed.WithTitle("Queue Cleared");
                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the clear queue command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }

    }
}
