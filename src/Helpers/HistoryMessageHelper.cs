using System.Collections;
using Newtonsoft.Json.Linq;
using Velody.InteractionHandlers;
using Velody.MongoDBIntegration.Models;
using Velody.MongoDBIntegration.Repositories;
using Velody.Video;

namespace Velody.Helpers
{
    public class HistoryMessageHelper
    {

        public const int PAGE_SIZE = 10;

        public static string formatVideo(PopulatedHistoryModel history)
        {
            VideoModel video = history.Video;
            TimeSpan totalDuration = new TimeSpan(0, 0, video.Duration);
            string timeString = $"`{totalDuration:mm\\:ss}`";

            string text = $@"[{video.Title}]({video.Url}) - {timeString}
            Requested by: <@{history.UserId}>. Played on {history.PlayedAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm")}.";

            return text;
        }

        public static async void HandleHistoryMessage(EmbedBuilder embed, HistoryRepository historyRepository, string guildId, int page)
        {
            int offset = page * PAGE_SIZE;
            int historyLength = await historyRepository.GetHistoryCount(guildId);
            int totalPages = historyLength / PAGE_SIZE + 1;
            List<PopulatedHistoryModel>? history = await historyRepository.GetHistoryByServerId(guildId, PAGE_SIZE, offset);
            embed.WithTitle("History");

            string description = String.Empty;
            if (history == null || (history.Count == 0 && page == 0))
            {
                description = "The history is empty.";
            }


            if (history != null && history.Count > 0)
            {
                description += "__Previously played:__\n";
                for (int i = 0; i < history.Count; i++)
                {
                    description += $"`{i + 1 + page * PAGE_SIZE}.` {formatVideo(history[i])}\n";
                }
            }

            bool isFirstPage = page == 0;
            bool isLastPage = page == totalPages - 1;

            if (totalPages > 1)
            {
                description += $"\n__Page:__ {page + 1} / {totalPages}";

                JObject data = new JObject();
                data["page"] = isFirstPage ? 0 : page - 1;
                embed.WithActionButton("Previous", HistoryInteractionHandler.ActionType, data, isFirstPage);

                data["page"] = isLastPage ? page : page + 1;
                embed.WithActionButton("Next", HistoryInteractionHandler.ActionType, data, isLastPage);
            }
            embed.WithDescription(description);
            await embed.Send();
        }
    }
}