using System.Collections;
using Newtonsoft.Json.Linq;
using Velody.InteractionHandlers;
using Velody.Video;

namespace Velody.Helpers
{
    public class QueueMessageHelper
    {

        public static int PAGE_SIZE = 10;

        public static string formatVideo(VideoInfo video)
        {
            TimeSpan totalDuration = new TimeSpan(0, 0, video.Duration);
            string timeString = $"`{totalDuration:mm\\:ss}`";

            return $"[{video.Title}]({video.Url}) - {timeString}";
        }

        public static async void HandleQueueMessage(EmbedBuilder embed, Velody.Server.Queue queue, int page)
        {
            int pageSize = page == 0 ? PAGE_SIZE + 1 : PAGE_SIZE;
            List<VideoInfo> videos = queue.GetQueue(pageSize, page * PAGE_SIZE + 1);
            int queueLength = queue.GetQueueLength();

            embed.WithTitle("Queue");

            string description = String.Empty;

            if (videos.Count == 0 && page == 0)
            {
                description = "The queue is empty.";
            }

            if (page == 0 && videos.Count > 0)
            {
                description = $"__Now Playing:__\n {formatVideo(videos[0])}\n\n";
                videos.RemoveAt(0);
            }

            description += "__Up Next:__\n";
            for (int i = 0; i < videos.Count; i++)
            {
                description += $"`{i + 1 + page * PAGE_SIZE}.` {formatVideo(videos[i])}\n";
            }

            int queueDuration = queue.GetQueueDuration();
            TimeSpan totalDuration = new TimeSpan(0, 0, queueDuration);
            description += $"__Queue Length:__ {totalDuration:mm\\:ss}\n";

            description += $"__Total:__ {queueLength} videos.\n";
            description += $"\n__Page:__ {page + 1} / {queueLength / PAGE_SIZE + 1}";

            embed.WithDescription(description);

            bool isFirstPage = page == 0;
            bool isLastPage = page == queueLength / PAGE_SIZE;


            JObject data = new JObject();
            data["page"] = isFirstPage ? 0 : page - 1;


            embed.WithActionButton("Previous", QueueInteractionHandler.ActionType, data, isFirstPage);

            data["page"] = isLastPage ? page : page + 1;
            embed.WithActionButton("Next", QueueInteractionHandler.ActionType, data, isLastPage);


            await embed.Send();
        }
    }
}