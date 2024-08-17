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
    public class TTS
    {
        private readonly ITTSProvider _ttsProvider;

        public TTS()
        {
            _ttsProvider = new GoogleTTS();
        }

        public Task DownloadTTSAsync(string text, string filePath)
        {
            return _ttsProvider.DownloadTTSAsync(text, filePath);
        }
    }
}
