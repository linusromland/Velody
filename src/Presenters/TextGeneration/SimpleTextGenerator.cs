using DSharpPlus;
using Velody.MongoDBIntegration.Models;
using Velody.Utils;
using Velody.Video;

namespace Velody.Presenters.TextGeneration
{
    public class SimpleTextGenerator : ITextGenerator
    {

        private readonly DiscordClient _client;

        public SimpleTextGenerator(DiscordClient client)
        {
            _client = client;
        }

        public string ServiceName => "SimpleTextGenerator";

        public string GenerateTextForFirstVideo(VideoInfo nextVideo)
        {

            string nickname = GetUser.GetNickname(_client, nextVideo);

            return $"First up for this session is {nextVideo.Title}. Requested by {nickname}.";
        }

        public string GenerateTextForNextVideo(VideoInfo nextVideo, List<PopulatedHistoryModel> previousVideos)
        {
            PopulatedHistoryModel lastVideo = previousVideos[^1];

            string nickname = GetUser.GetNickname(_client, nextVideo);

            return $@"
            That was {lastVideo.Video.Title}.
            Next up is {nextVideo.Title}. Requested by {nickname}.
            ";
        }
        public string GenerateTextForLastVideo(PopulatedHistoryModel lastVideo)
        {
            return $@"
            That was {lastVideo.Video.Title}.
            That's all for this session.
            ";
        }
    }
}