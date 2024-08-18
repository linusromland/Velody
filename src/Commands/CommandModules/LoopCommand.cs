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
    public class LoopCommand(ServerManager serverManager) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("LoopCommand");

        private readonly ServerManager _serverManager = serverManager;

        [SlashCommand("loop", "Loops the currently playing video.")]
        public async Task Loop(InteractionContext ctx)
        {
            EmbedBuilder embed = new EmbedBuilder(ctx);
            try
            {
                Server.Server? server = _serverManager.GetServer(ctx.Guild.Id, false);
                if (server == null)
                {
                    embed.WithTitle("Not Found");
                    embed.WithDescription("Nothing is currently playing.");
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

                server.Queue.Loop = !server.Queue.Loop;

                embed.WithTitle("Loop");
                embed.WithDescription($"Looping is now {(server.Queue.Loop ? "enabled" : "disabled")}.");
                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the loop command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }

    }
}
