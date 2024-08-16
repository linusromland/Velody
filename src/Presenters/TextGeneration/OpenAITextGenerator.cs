using DSharpPlus;
using OpenAI.Chat;
using Velody.Utils;
using Velody.Video;

namespace Velody.Presenters.TextGeneration
{
    public class OpenAITextGenerator : ITextGenerator
    {

        private readonly DiscordClient _client;

        public OpenAITextGenerator(DiscordClient client)
        {
            _client = client;
        }

        public string ServiceName => "OpenAITextGenerator";

        public string GenerateTextForNextVideo(VideoInfo nextVideo)
        {
            if (Settings.OpenAIApiKey == null)
            {
                throw new InvalidOperationException("OpenAI API key is not set.");
            }

            ChatClient client = new(model: "gpt-4o-mini", Settings.OpenAIApiKey);

            ulong userId = ulong.Parse(nextVideo.UserId);
            string userName = _client.GetUserAsync(userId).Result.Username;

            string prompt = $@"
            You are a DJ at a party. You are about to play the next song. The next song is {nextVideo.Title}. This was requested by {userName}.
            You are very enthusiastic. You want to make the party as fun as possible. You want to make sure everyone is having a great time. You do not use any emojis, only normal text. Max two sentences. 
            ";

            ChatCompletion completion = client.CompleteChat(prompt);

            return completion.ToString();
        }
    }
}