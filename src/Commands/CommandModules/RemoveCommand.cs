using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;
using Serilog;
using Velody.Server;
using Velody.Utils;
using Velody.Video;
using static Velody.Server.VoiceManager;

namespace Velody
{
    public class RemoveCommand(ServerManager serverManager, VideoHandler videoHandler) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("RemoveCommand");
        private readonly ServerManager _serverManager = serverManager;
        private readonly VideoHandler _videoHandler = videoHandler;

        [SlashCommand("remove", "Removes a video from the queue.")]
        public async Task Play(InteractionContext ctx, [Option("index", "index of video to remove")] string index)
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

                int parsedIndex = int.Parse(index) + 1; // +1 to match the queue index and ignore the currently playing video

                if (parsedIndex < 1 || parsedIndex > server.Queue.GetQueueLength())
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("Invalid index.");
                    await embed.Send();
                    return;
                }

                VideoInfo video = server.Queue.RemoveVideo(parsedIndex - 1);

                embed.WithTitle($"Removed: `{video.Title}`");
                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the remove command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }
    }
}