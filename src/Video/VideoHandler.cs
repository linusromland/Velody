using Serilog;

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
		private static readonly ILogger _logger = Logger.CreateLogger("VideoHandler");

		private readonly BaseVideoModule _videoModule;

		public VideoHandler(VideoService videoService)
		{
			_videoModule = videoService switch
			{
				VideoService.Youtube => new YoutubeModule(),
				_ => throw new NotImplementedException()
			};
		}

		public async Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl)
		{
			_logger.Information("Getting video info for {SearchStringOrUrl}", searchStringOrUrl);
			VideoInfo[] videos = await _videoModule.GetVideoInfo(searchStringOrUrl);
			return videos;
		}

		public async Task<string> DownloadVideoAsync(string searchStringOrUrl)
		{
			_logger.Information("Downloading video for {SearchStringOrUrl}", searchStringOrUrl);
			string filePath = await _videoModule.DownloadVideoAsync(searchStringOrUrl);
			_logger.Information("Downloaded video for {SearchStringOrUrl}", searchStringOrUrl);
			return filePath;
		}
	}
}