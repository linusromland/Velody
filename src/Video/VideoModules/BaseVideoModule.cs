namespace Velody.Video.VideoModules
{
    public abstract class BaseVideoModule
    {
        public abstract Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl, string guildId, string userId, string channelId);

        public abstract Task<string> DownloadVideoAsync(string videoId, string path);
    }
}