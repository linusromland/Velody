using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;
using Serilog;

namespace Velody
{
	public class VideoRepository
	{
		private readonly ILogger _logger = Logger.CreateLogger("VideoRepository");
		private readonly IMongoCollection<Video> _videoCollection;

		public VideoRepository(MongoDBHelper mongoDBHelper)
		{
			_videoCollection = mongoDBHelper.GetCollection<Video>("video");
		}

		public async Task InsertVideo(VideoInfo videoInfo)
		{
			Video video = new Video
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

		public async Task<Video?> GetVideo(string videoId, VideoService videoService)
		{
			FilterDefinition<Video> filter = Builders<Video>.Filter.Eq(v => v.VideoId, videoId) & Builders<Video>.Filter.Eq(v => v.VideoService, videoService);
			return await _videoCollection.Find(filter).FirstOrDefaultAsync();
		}
	}
}

