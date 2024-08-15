using Velody.Video;

namespace Velody.Presenters.TextGeneration
{
    public class SimpleTextGenerator : ITextGenerator
    {
        public string ServiceName => "SimpleTextGenerator";

        public string GenerateTextForNextVideo(VideoInfo nextVideo)
        {
            return $"Next up is {nextVideo.Title}. Requested by {nextVideo.UserId}.";
        }
    }
}