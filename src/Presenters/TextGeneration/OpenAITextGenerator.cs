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
            You are a DJ in a Discord voice channel. Speak with energy and enthusiasm, addressing the community by their usernames when appropriate. Make sure to roast the requested songs. Do not use any emojis, only normal text. Max two sentences.
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

        public const string ServiceNameConst = "OpenAITextGenerator";

        public string ServiceName => ServiceNameConst;

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
            string prompt = BasePrompt;
            List<PopulatedHistoryModel> videosSinceLastAnnouncement = previousVideos.TakeWhile(video => !video.Announced).ToList();
            string nickname = GetUser.GetNickname(_discordClient, nextVideo);

            if (videosSinceLastAnnouncement.Count == 0)
            {
                PopulatedHistoryModel lastVideo = previousVideos[^1];
                prompt += $@"
                    You have just played a song. The last song was {lastVideo.Video.Title}. The next song is {nextVideo.Title}. This was requested by {nickname}.
                ";
            }
            else
            {
                prompt += $@"
                    You have just played {videosSinceLastAnnouncement.Count} songs since the last announcement. Mention these songs if fitting. These were from newest to oldest:
                ";

                foreach (PopulatedHistoryModel video in videosSinceLastAnnouncement)
                {
                    prompt += $@"
                        {video.Video.Title}
                    ";
                }

                prompt += $@"
                    The next song is {nextVideo.Title}. This was requested by {nickname}.
                ";
            }

            Console.WriteLine(prompt);

            ChatCompletion completion = _openaiClient.CompleteChat(prompt);

            return completion.ToString();
        }

        public string GenerateTextForLastVideo(PopulatedHistoryModel lastVideo)
        {
            string prompt = $@"
            {BasePrompt}
            You have just played the last song of the session. The last song was {lastVideo.Video.Title}.
            Always end with saying goodbye.
            ";

            ChatCompletion completion = _openaiClient.CompleteChat(prompt);

            return completion.ToString();
        }
    }
}