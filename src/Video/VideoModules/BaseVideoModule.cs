namespace Velody.Video.VideoModules
{
	public abstract class BaseVideoModule
	{
		public abstract Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl, string guildId, string userId);

		public abstract Task<string> DownloadVideoAsync(string videoId, string path);
	}
}