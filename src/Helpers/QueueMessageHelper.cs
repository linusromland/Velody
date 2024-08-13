using System.Collections;
using Newtonsoft.Json.Linq;
using Velody.InteractionHandlers;
using Velody.Video;

namespace Velody.Helpers
{
    public class QueueMessageHelper
    {

        public const int PAGE_SIZE = 10;

        public static string formatVideo(VideoInfo video)
        {
            TimeSpan totalDuration = new TimeSpan(0, 0, video.Duration);
            string timeString = $"`{totalDuration:mm\\:ss}`";

            return $"[{video.Title}]({video.Url}) - {timeString}";
        }

        public static async void HandleQueueMessage(EmbedBuilder embed, Velody.Server.Queue queue, int page)
        {
            int pageSize = page == 0 ? PAGE_SIZE + 1 : PAGE_SIZE;
            int offset = page == 0 ? 0 : page * PAGE_SIZE + 1;
            int queueLength = queue.GetQueueLength();
            int totalPages = queueLength / PAGE_SIZE + 1;
            List<VideoInfo> videos = queue.GetQueue(pageSize, offset);


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

            Console.WriteLine(videos.Count);

            if (videos.Count > 0)
            {
                description += "__Up Next:__\n";
                for (int i = 0; i < videos.Count; i++)
                {
                    description += $"`{i + 1 + page * PAGE_SIZE}.` {formatVideo(videos[i])}\n";
                }

                int queueDuration = queue.GetQueueDuration();
                TimeSpan totalDuration = new TimeSpan(0, 0, queueDuration);
                description += $"__Queue Length:__ {totalDuration:mm\\:ss}\n";

                description += $"__Total:__ {queueLength} videos.\n";
            }

            bool isFirstPage = page == 0;
            bool isLastPage = page == totalPages - 1;

            if (totalPages > 1)
            {
                description += $"\n__Page:__ {page + 1} / {totalPages}";

                JObject data = new JObject();
                data["page"] = isFirstPage ? 0 : page - 1;
                embed.WithActionButton("Previous", QueueInteractionHandler.ActionType, data, isFirstPage);

                data["page"] = isLastPage ? page : page + 1;
                embed.WithActionButton("Next", QueueInteractionHandler.ActionType, data, isLastPage);
            }
            embed.WithDescription(description);

            await embed.Send();
        }
    }
}