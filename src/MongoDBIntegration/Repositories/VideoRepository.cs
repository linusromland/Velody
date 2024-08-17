using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;
using Serilog;
using Velody.MongoDBIntegration.Models;
using Velody.Utils;
using Velody.Video;

namespace Velody.MongoDBIntegration.Repositories
{
	public class VideoRepository
	{
		private readonly ILogger _logger = Logger.CreateLogger("VideoRepository");
		private readonly IMongoCollection<VideoModel> _videoCollection;

		public VideoRepository(MongoDBHelper mongoDBHelper)
		{
			_videoCollection = mongoDBHelper.GetCollection<VideoModel>("video");
		}

		public async Task InsertVideo(VideoInfo videoInfo)
		{
			VideoModel video = new VideoModel
			{
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow,
				VideoService = videoInfo.Service,
				VideoId = videoInfo.VideoId,
				Title = videoInfo.Title,
				Duration = videoInfo.Duration,
				Url = videoInfo.Url,
				Thumbnail = videoInfo.Thumbnail
			};

			_logger.Information("Inserting video {VideoId} into the database", video.VideoId);
			if (await GetVideo(video.VideoId, video.VideoService) == null)
			{
				await _videoCollection.InsertOneAsync(video);
			}
		}

		public async Task InsertVideo(VideoInfo[] videoInfos)
		{
			foreach (VideoInfo videoInfo in videoInfos)
			{
				await InsertVideo(videoInfo);
			}
		}

		public async Task<VideoModel?> GetVideo(string videoId, VideoService videoService)
		{
			FilterDefinition<VideoModel> filter = Builders<VideoModel>.Filter.Eq(v => v.VideoId, videoId) & Builders<VideoModel>.Filter.Eq(v => v.VideoService, videoService);
			return await _videoCollection.Find(filter).FirstOrDefaultAsync();
		}
		public async Task<VideoModel?> GetVideo(ObjectId id)
		{
			FilterDefinition<VideoModel> filter = Builders<VideoModel>.Filter.Eq(v => v.Id, id);
			return await _videoCollection.Find(filter).FirstOrDefaultAsync();
		}
	}
}

