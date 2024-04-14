namespace Velody
{
	public enum VideoService
	{
		Youtube
	}

	public class VideoInfo
	{
		public required string Id { get; set; }
		public required string Title { get; set; }
		public required int Duration { get; set; }
		public required string Url { get; set; }
		public required string Thumbnail { get; set; }
		public required VideoService Service { get; set; }
	}

	public abstract class BaseVideoModule
	{
		public abstract Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl);

		public abstract Task<string> DownloadVideoAsync(string searchStringOrUrl);
	}

	public class VideoHandler
	{
		private readonly YoutubeModule _youtubeModule = new YoutubeModule();

		public YoutubeModule GetYoutubeModule()
		{
			return _youtubeModule;
		}
	}
}