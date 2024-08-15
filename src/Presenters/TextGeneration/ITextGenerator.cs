using Velody.Video;

namespace Velody.Presenters.TextGeneration
{
    public interface ITextGenerator
    {
        string ServiceName { get; }
        string GenerateTextForNextVideo(VideoInfo nextVideo);
    }
}