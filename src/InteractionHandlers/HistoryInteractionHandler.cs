using System.Reflection.Metadata;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using Newtonsoft.Json.Linq;
using Velody.Helpers;
using Velody.MongoDBIntegration.Repositories;
using Velody.Server;

namespace Velody.InteractionHandlers
{
	public class HistoryInteractionHandler
	{
		public const string ActionType = "HISTORY";
		public static void HandleInteraction(HistoryRepository historyRepository, DiscordClient client, ComponentInteractionCreateEventArgs e, JObject data)
		{
			EmbedBuilder embed = new(e.Message);

			int? page = data["page"]?.ToObject<int>();

			if (page == null)
			{
				return;
			}

			HistoryMessageHelper.HandleHistoryMessage(embed, historyRepository, e.Guild.Id.ToString(), page.Value);
		}

	}
}