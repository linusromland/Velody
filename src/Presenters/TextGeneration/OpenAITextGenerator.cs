using DSharpPlus;
using OpenAI.Chat;
using Velody.MongoDBIntegration.Models;
using Velody.Utils;
using Velody.Video;

namespace Velody.Presenters.TextGeneration
{
    public class OpenAITextGenerator : ITextGenerator
    {
        private const string Model = "gpt-4o-mini";
        private const string BasePrompt = @"
            You are a DJ in a Discord voice channel. Your goal is to keep the chat lively and engaging while playing music. You want to ensure everyone in the channel is enjoying the music and having a good time. Speak with energy and enthusiasm, addressing the community by their usernames when appropriate. Do not use any emojis, only normal text. Max two sentences.
        ";

        private readonly DiscordClient _discordClient;
        private readonly ChatClient _openaiClient;

        public OpenAITextGenerator(DiscordClient client)
        {
            if (Settings.OpenAIApiKey == null)
            {
                throw new InvalidOperationException("OpenAI API key is not set.");
            }

            _discordClient = client;
            _openaiClient = new ChatClient(model: Model, Settings.OpenAIApiKey);
        }

        public string ServiceName => "OpenAITextGenerator";

        public string GenerateTextForFirstVideo(VideoInfo nextVideo)
        {
            string nickname = GetUser.GetNickname(_discordClient, nextVideo);

            string prompt = $@"
            {BasePrompt}
            You are about to play the first song of the session. The first song is {nextVideo.Title}. This was requested by {nickname}.
            ";

            ChatCompletion completion = _openaiClient.CompleteChat(prompt);

            return completion.ToString();
        }

        public string GenerateTextForNextVideo(VideoInfo nextVideo, List<PopulatedHistoryModel> previousVideos)
        {
            PopulatedHistoryModel lastVideo = previousVideos[^1];

            string nickname = GetUser.GetNickname(_discordClient, nextVideo);

            string prompt = $@"
            {BasePrompt}
            You have just played a song. The last song was {lastVideo.Video.Title}. The next song is {nextVideo.Title}. This was requested by {nickname}.
            ";

            ChatCompletion completion = _openaiClient.CompleteChat(prompt);

            return completion.ToString();
        }

        public string GenerateTextForLastVideo(PopulatedHistoryModel lastVideo)
        {
            string prompt = $@"
            {BasePrompt}
            You have just played the last song of the session. The last song was {lastVideo.Video.Title}.
            Always end with saying goodbye to the community and thanking them for joining the session.
            ";

            ChatCompletion completion = _openaiClient.CompleteChat(prompt);

            return completion.ToString();
        }
    }
}