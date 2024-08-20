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
    public class ShuffleQueueCommand(ServerManager serverManager) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("ShuffleQueueCommand");

        private readonly ServerManager _serverManager = serverManager;

        [SlashCommand("shuffle", "Shuffle the queue.")]
        public async Task ShuffleQueue(InteractionContext ctx)
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
                    embed.WithDescription("The queue is empty.");
                    await embed.Send();
                    return;
                }
                server.Queue.ShuffleQueue();

                embed.WithTitle("Queue shuffled");
                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the shuffleQueue command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }

    }
}
