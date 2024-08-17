using DSharpPlus;
using OpenAI.Chat;
using Velody.MongoDBIntegration.Models;
using Velody.Utils;
using Velody.Video;

namespace Velody.Presenters.TextGeneration
{
    public class OpenAITextGenerator : ITextGenerator
    {

        private readonly DiscordClient _discordClient;
        private readonly ChatClient _openaiClient;

        public OpenAITextGenerator(DiscordClient client)
        {
            if (Settings.OpenAIApiKey == null)
            {
                throw new InvalidOperationException("OpenAI API key is not set.");
            }

            _discordClient = client;
            _openaiClient = new ChatClient(model: "gpt-4o-mini", Settings.OpenAIApiKey);
        }

        public string ServiceName => "OpenAITextGenerator";

        public string GenerateTextForFirstVideo(VideoInfo nextVideo)
        {
            string nickname = GetUser.GetNickname(_discordClient, nextVideo);

            string prompt = $@"
            You are a DJ at a party. You are about to play the first song of the session. The first song is {nextVideo.Title}. This was requested by {nickname}.
            You are very enthusiastic. You want to make the party as fun as possible. You want to make sure everyone is having a great time. You do not use any emojis, only normal text. Max two sentences. 
            ";

            ChatCompletion completion = _openaiClient.CompleteChat(prompt);

            return completion.ToString();
        }

        public string GenerateTextForNextVideo(VideoInfo nextVideo, List<PopulatedHistoryModel> previousVideos)
        {
            PopulatedHistoryModel lastVideo = previousVideos[^1];

            string nickname = GetUser.GetNickname(_discordClient, nextVideo);

            string prompt = $@"
            You are a DJ at a party. You have just played a song. The last song was {lastVideo.Video.Title}. The next song is {nextVideo.Title}. This was requested by {nickname}.
            You are very enthusiastic. You want to make the party as fun as possible. You want to make sure everyone is having a great time. You do not use any emojis, only normal text. Max two sentences. 
            ";

            ChatCompletion completion = _openaiClient.CompleteChat(prompt);

            return completion.ToString();
        }
    }
}