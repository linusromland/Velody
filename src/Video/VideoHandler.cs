using Serilog;
using Velody.MongoDBIntegration.Models;
using Velody.MongoDBIntegration.Repositories;
using Velody.Utils;
using Velody.Video.VideoModules;

namespace Velody.Video
{
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
			VideoModel? video = await _videoRepository.GetVideo(videoId, VideoService);
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
				else
				{
					_logger.Warning("Video {VideoId} is not cached, removing from cache", videoId);
					await _cacheRepository.RemoveCache(video.Id);
				}
			}

			// TODO: Add clear of cache here
			BaseVideoModule videoModule = GetService(VideoService);
			string directory = GetDirectory.GetCachePath(VideoService.ToString());
			string filePath = $"{directory}/{videoId}.mp3";

			string downloadedPath = await videoModule.DownloadVideoAsync(video.VideoId, filePath);
			await _cacheRepository.InsertCache(video.Id, downloadedPath);
			return downloadedPath;
		}

	}
}