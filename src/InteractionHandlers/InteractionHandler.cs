using System.Diagnostics;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using DSharpPlus.VoiceNext;
using Newtonsoft.Json.Linq;
using Velody.Server;

namespace Velody.InteractionHandlers
{
    public class InteractionHandler
    {
        public const string ACTION_DELIMITER = "|||";
        public const string DATA_DELIMITER = ";;;";
        public const string DATA_VALUE_DELIMITER = "===";

        public static string StringifyData(string actionType, JObject data)
        {
            string value = $"{actionType}{InteractionHandler.ACTION_DELIMITER}";
            foreach (KeyValuePair<string, JToken?> pair in data)
            {
                if (pair.Value == null)
                {
                    continue;
                }

                value += $"{pair.Key}{InteractionHandler.DATA_VALUE_DELIMITER}{pair.Value}{InteractionHandler.DATA_DELIMITER}";
            }

            return value;
        }

        public static string ParseAction(string dataString)
        {
            string[] parts = dataString.Split(InteractionHandler.ACTION_DELIMITER);
            return parts[0];
        }

        public static JObject ParseData(string dataString)
        {
            JObject data = new();

            string[] parts = dataString.Split(InteractionHandler.ACTION_DELIMITER)[1].Split(InteractionHandler.DATA_DELIMITER);

            foreach (string part in parts)
            {
                string[] pair = part.Split(InteractionHandler.DATA_VALUE_DELIMITER);
                if (pair.Length != 2)
                {
                    continue;
                }

                data[pair[0]] = pair[1];
            }

            return data;
        }

        public static async Task HandleInteraction(ServerManager serverManager, DiscordClient client, ComponentInteractionCreateEventArgs e)
        {
            await e.Interaction.CreateResponseAsync(InteractionResponseType.DeferredMessageUpdate);
            string dataString = e.Id;

            string action = InteractionHandler.ParseAction(dataString);
            JObject data = InteractionHandler.ParseData(dataString);
            if (action == null)
            {
                return;
            }


            switch (action)
            {
                case QueueInteractionHandler.ActionType:
                    QueueInteractionHandler.HandleInteraction(serverManager, client, e, data);
                    break;
                default:
                    break;
            }
        }
    }
}