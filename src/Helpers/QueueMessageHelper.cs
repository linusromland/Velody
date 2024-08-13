using System.Collections;
using Newtonsoft.Json.Linq;
using Velody.InteractionHandlers;
using Velody.Video;

namespace Velody.Helpers
{
    public class QueueMessageHelper
    {

        public static int PAGE_SIZE = 10;
        public static async void HandleQueueMessage(EmbedBuilder embed, Velody.Server.Queue queue, int page)
        {
            List<VideoInfo> videos = queue.GetQueue(PAGE_SIZE, page * PAGE_SIZE);
            int queueLength = queue.GetQueueLength();

            embed.WithTitle("Queue");
            embed.WithDescription("```" + string.Join("\n", videos.Select((video, index) => $"{index + 1}. {video.Title}")) + "```");

            bool isFirstPage = page == 0;
            bool isLastPage = page * PAGE_SIZE + videos.Count >= queueLength;


            JObject data = new JObject();
            data["page"] = isFirstPage ? 0 : page - 1;
            data["direction"] = -1;


            embed.WithActionButton("Previous", QueueInteractionHandler.ActionType, data, isFirstPage);

            data["page"] = isLastPage ? page : page + 1;
            data["direction"] = 1;
            embed.WithActionButton("Next", QueueInteractionHandler.ActionType, data, isLastPage);


            await embed.Send();
        }
    }
}