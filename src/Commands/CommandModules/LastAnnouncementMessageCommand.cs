using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;
using Serilog;
using Velody.MongoDBIntegration.Models;
using Velody.MongoDBIntegration.Repositories;
using Velody.Server;
using Velody.Utils;
using Velody.Video;
using static Velody.Server.VoiceManager;

namespace Velody
{
    public class LastAnnouncementMessageCommand(AnnounceMessageRepository announceMessageRepository) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("LastAnnouncementMessageCommand");
        private readonly AnnounceMessageRepository _announceMessageRepository = announceMessageRepository;

        [SlashCommand("lastAnnouncementMessage", "Display the last announcement message.")]
        public async Task LastTTSMessage(InteractionContext ctx)
        {
            EmbedBuilder embed = new EmbedBuilder(ctx);
            try
            {
                string serverGuild = ctx.Guild.Id.ToString();
                AnnounceMessageModel? lastAnnouncementMessage = await _announceMessageRepository.GetLastAnnouncementMessage(serverGuild);
                if (lastAnnouncementMessage == null)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("There is no last announcement message.");
                    await embed.Send();
                    return;
                }

                embed.WithTitle("Last Announcement Message");
                embed.WithDescription(@$"
                    ```{lastAnnouncementMessage.Message}```
                    Played at: {lastAnnouncementMessage.PlayedAt}
                    Announce Service: {lastAnnouncementMessage.AnnounceService}
                ");


                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the play command.");
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
