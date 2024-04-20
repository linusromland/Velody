using Serilog;

namespace Velody
{
	public enum VideoService
	{
		Youtube
	}

	public class VideoInfo
	{
		public required string VideoId { get; set; }
		public required string Title { get; set; }
		public required int Duration { get; set; }
		public required string Url { get; set; }
		public required string Thumbnail { get; set; }
		public required VideoService Service { get; set; }
		public required string GuildId { get; set; }
		public required string UserId { get; set; }
	}

	public abstract class BaseVideoModule
	{
		public abstract Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl, string guildId, string userId);

		public abstract Task<string> DownloadVideoAsync(string videoId, string path);
	}

	public class VideoHandler(VideoRepository videoRepository, CacheRepository cacheRepository)
	{
		private readonly ILogger _logger = Logger.CreateLogger("VideoHandler");
		private readonly YoutubeModule _youtubeModule = new YoutubeModule();
		private readonly VideoRepository _videoRepository = videoRepository;
		private readonly CacheRepository _cacheRepository = cacheRepository;

		private BaseVideoModule GetService(VideoService VideoService)
		{
			switch (VideoService)
			{
				case VideoService.Youtube:
					return _youtubeModule;
				default:
					throw new NotSupportedException($"Video service {VideoService} not supported");
			}
		}

		public async Task<VideoInfo[]> GetVideoInfo(VideoService VideoService, string searchStringOrUrl, string guildId, string userId)
		{
			BaseVideoModule videoModule = GetService(VideoService);
			VideoInfo[] videoInfos = await videoModule.GetVideoInfo(searchStringOrUrl, guildId, userId);
			await _videoRepository.InsertVideo(videoInfos);
			return videoInfos;
		}

		public async Task<string?> DownloadVideoAsync(VideoService VideoService, string videoId)
		{
			Video? video = await _videoRepository.GetVideo(videoId, VideoService);
			if (video == null)
			{
				_logger.Error("Video {VideoId} not found in the database", videoId);
				return null;
			}

			string? cachePath = await _cacheRepository.GetPath(video.Id);
			if (cachePath != null)
			{
				if (File.Exists(cachePath))
				{
					_logger.Information("Video {VideoId} is already cached", videoId);
					return cachePath;
				}
			}

			// TODO: Add clear of cache here
			BaseVideoModule videoModule = GetService(VideoService);
			string downloadedPath = await videoModule.DownloadVideoAsync(video.VideoId, $"./cache/{VideoService}/{videoId}.mp3");
			await _cacheRepository.InsertCache(video.Id, downloadedPath);
			return downloadedPath;
		}

	}
}