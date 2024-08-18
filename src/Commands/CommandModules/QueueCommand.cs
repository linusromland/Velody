using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;
using Newtonsoft.Json.Linq;
using Serilog;
using Velody.Helpers;
using Velody.InteractionHandlers;
using Velody.MongoDBIntegration.Repositories;
using Velody.Server;
using Velody.Utils;
using Velody.Video;

namespace Velody
{
    public class QueueCommand(ServerManager serverManager) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("QueueCommand");

        private readonly ServerManager _serverManager = serverManager;

        [SlashCommand("queue", "Display the current queue.")]
        public async Task Queue(InteractionContext ctx)
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
                if (queue.Count == 0)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("Queue is empty.");
                    await embed.Send();
                    return;
                }

                QueueMessageHelper.HandleQueueMessage(embed, server.Queue, 0);
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the queue command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }

    }
}
