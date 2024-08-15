using Velody.Presenters.TextGeneration;
using Velody.Presenters.TTS;
using Velody.Video;

namespace Velody.Presenters
{
    public class Presenter
    {
        private readonly ITTSProvider _ttsProvider;
        private readonly ITextGenerator _textGenerator;

        public Presenter(ITTSProvider ttsProvider, ITextGenerator textGenerator)
        {
            _ttsProvider = ttsProvider;
            _textGenerator = textGenerator;
        }

        public async Task AnnounceNextSongAsync(VideoInfo nextSong)
        {
            string text = _textGenerator.GenerateTextForNextVideo(nextSong);
            // TODO: Save to mongo.
            await _ttsProvider.SpeakAsync(text);
        }
    }
}