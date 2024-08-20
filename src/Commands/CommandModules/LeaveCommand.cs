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
    public class LeaveCommand(ServerManager serverManager, HistoryRepository historyRepository) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("LeaveCommand");
        private readonly ServerManager _serverManager = serverManager;
        private HistoryRepository _historyRepository = historyRepository;

        [SlashCommand("leave", "Leave the voice channel.")]
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

                server.DisposeServer();

                embed.WithTitle("Left the voice channel.");
                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the leave command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }

        static string CreateProgressBar(TimeSpan currentPlayTime, TimeSpan totalDuration, int barLength)
        {
            double percentagePlayed = currentPlayTime.TotalSeconds / totalDuration.TotalSeconds;
            int playedLength = (int)(percentagePlayed * barLength);

            return $"{new string('▬', playedLength)}🔘{new string('▬', barLength - playedLength)}";
        }
    }
}
