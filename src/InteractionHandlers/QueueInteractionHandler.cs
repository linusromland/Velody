using System.Reflection.Metadata;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using Newtonsoft.Json.Linq;
using Velody.Helpers;
using Velody.Server;

namespace Velody.InteractionHandlers
{
	public class QueueInteractionHandler
	{
		public const string ActionType = "QUEUE";
		public static void HandleInteraction(ServerManager _serverManager, DiscordClient client, ComponentInteractionCreateEventArgs e, JObject data)
		{
			EmbedBuilder embed = new(e.Message);

			Server.Server? server = _serverManager.GetServer(e.Guild.Id);

			if (server == null)
			{
				return;
			}

			int? page = data["page"]?.ToObject<int>();

			if (page == null)
			{
				return;
			}

			QueueMessageHelper.HandleQueueMessage(embed, server.Queue, page.Value);
		}

	}
}