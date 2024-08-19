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
    public class PresenterCommand(ServerManager serverManager) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("PresenterCommand");

        private readonly ServerManager _serverManager = serverManager;

        [SlashCommand("presenter", "Toggle the presenter feature.")]
        public async Task Loop(InteractionContext ctx)
        {
            EmbedBuilder embed = new EmbedBuilder(ctx);
            try
            {
                if (!Settings.PresenterEnabled)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("The presenter has been disabled by the bot owner.");
                    await embed.Send();
                    return;
                }

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

                server.Queue.IsAnnouncementEnabled = !server.Queue.IsAnnouncementEnabled;

                embed.WithTitle("Presenter");
                embed.WithDescription($"Presenter is now {(server.Queue.IsAnnouncementEnabled ? "enabled" : "disabled")}.");
                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the presenter command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }

    }
}
