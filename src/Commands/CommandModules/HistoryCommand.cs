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
    public class HistoryCommand(HistoryRepository historyRepository) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("HistoryCommand");

        private readonly HistoryRepository _historyRepository = historyRepository;

        [SlashCommand("history", "Display the last played videos.")]
        public async Task History(InteractionContext ctx)
        {
            EmbedBuilder embed = new EmbedBuilder(ctx);
            try
            {
                HistoryMessageHelper.HandleHistoryMessage(embed, _historyRepository, ctx.Guild.Id.ToString(), 0);
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the history command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }

    }
}
