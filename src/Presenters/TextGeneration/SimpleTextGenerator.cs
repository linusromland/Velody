using DSharpPlus;
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

        public string GenerateTextForNextVideo(VideoInfo nextVideo)
        {
            string nickname = GetUser.GetNickname(_client, nextVideo);

            return $"Next up is {nextVideo.Title}. Requested by {nickname}.";
        }
    }
}