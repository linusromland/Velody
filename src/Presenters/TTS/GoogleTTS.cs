using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Texttospeech.v1;
using Google.Apis.Texttospeech.v1.Data;
using Serilog;
using System.IO;
using System.Threading.Tasks;
using Velody.Utils;

namespace Velody.Presenters.TTS
{
    public class GoogleTTS : ITTSProvider
    {
        private readonly ILogger _logger = Logger.CreateLogger("GoogleTTS");

        public string ServiceName => "GoogleTTS";

        public async Task DownloadTTSAsync(string text, string filePath)
        {

            TexttospeechService textToSpeechService = new(new BaseClientService.Initializer
            {
                ApiKey = Settings.GoogleApiKey,
                ApplicationName = ServiceName,
            });

            SynthesisInput? input = new SynthesisInput
            {
                Text = text
            };

            VoiceSelectionParams voice = new VoiceSelectionParams
            {
                LanguageCode = "en-US",
                Name = "en-US-Neural2-J"
            };

            AudioConfig? audioConfig = new AudioConfig
            {
                AudioEncoding = "MP3",
                Pitch = 0,
                SpeakingRate = 1,
                EffectsProfileId = new[] { "large-home-entertainment-class-device" }
            };

            TextResource.SynthesizeRequest? request = textToSpeechService.Text.Synthesize(new SynthesizeSpeechRequest
            {
                Input = input,
                Voice = voice,
                AudioConfig = audioConfig
            });

            SynthesizeSpeechResponse? response = await request.ExecuteAsync();
            _logger.Information("Generated TTS for text: {Text}", text);

            byte[] audioBytes = Convert.FromBase64String(response.AudioContent);

            await File.WriteAllBytesAsync(filePath, audioBytes);
            _logger.Information("Saved TTS to file {FilePath}", filePath);
        }
    }
}
