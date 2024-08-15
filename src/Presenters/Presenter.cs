using Serilog;
using Velody.Presenters.TextGeneration;
using Velody.Presenters.TTS;
using Velody.Utils;
using Velody.Video;

namespace Velody.Presenters
{
    public class Presenter
    {
        private readonly ITTSProvider _ttsProvider;
        private readonly ITextGenerator _textGenerator;
        private readonly ILogger _logger = Logger.CreateLogger("Presenter");

        public Presenter(ITTSProvider ttsProvider, ITextGenerator textGenerator)
        {
            _ttsProvider = ttsProvider;
            _textGenerator = textGenerator;
        }

        public async Task<string> DownloadNextAnnouncementAsync(VideoInfo nextSong)
        {
            string text = _textGenerator.GenerateTextForNextVideo(nextSong);

            _logger.Information("Generating TTS for announcement: {Text}", text);

            string filePath = "tmp.mp3"; // TODO: have announcement id or something here.
            // TODO: Save to mongo.
            await _ttsProvider.DownloadTTSAsync(text, filePath);

            return filePath;
        }
    }
}