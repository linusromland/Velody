using Velody.MongoDBIntegration.Models;
using Velody.Video;

namespace Velody.Presenters.TextGeneration
{
    public interface ITextGenerator
    {
        string ServiceName { get; }
        string GenerateTextForFirstVideo(VideoInfo nextVideo);
        string GenerateTextForNextVideo(VideoInfo nextVideo, List<PopulatedHistoryModel> previousVideos);
        // TODO: add logic for generating text for last video
    }
}