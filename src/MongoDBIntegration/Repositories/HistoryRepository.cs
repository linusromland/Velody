using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;
using Velody.MongoDBIntegration.Models;

namespace Velody.MongoDBIntegration.Repositories
{
	public class HistoryRepository
	{
		private readonly IMongoCollection<HistoryModel> _historyCollection;
		private readonly VideoRepository _videoRepository;

		public HistoryRepository(MongoDBHelper mongoDBHelper, VideoRepository videoRepository)
		{
			_historyCollection = mongoDBHelper.GetCollection<HistoryModel>("history");
			_videoRepository = videoRepository;
		}

		public async Task<string> InsertHistory(ObjectId videoId, string userId, string guildId, string channelId, string sessionId, bool announced)
		{
			HistoryModel history = new HistoryModel
			{
				PlayedAt = DateTime.UtcNow,
				UserId = userId,
				GuildId = guildId,
				VideoId = videoId,
				ChannelId = channelId,
				SessionId = sessionId,
					Announced = announced
				};

			await _historyCollection.InsertOneAsync(history);
			return history.Id.ToString();
		}

		public async Task SkippedHistory(string historyId, TimeSpan skippedAt)
		{
			HistoryModel history = await _historyCollection.Find(h => h.Id == ObjectId.Parse(historyId)).FirstOrDefaultAsync();
			history.SkippedAt = (int)skippedAt.TotalSeconds;
			await _historyCollection.ReplaceOneAsync(h => h.Id == ObjectId.Parse(historyId), history);
		}

		public async Task<PopulatedHistoryModel?> GetHistory(string sessionId)
		{
			FilterDefinition<HistoryModel> filter = Builders<HistoryModel>.Filter.Eq(h => h.SessionId, sessionId);
			HistoryModel? historyItem = await _historyCollection.Find(filter).SortByDescending(h => h.PlayedAt).FirstOrDefaultAsync();
			VideoModel? video = await _videoRepository.GetVideo(historyItem.VideoId);

			if (video == null || historyItem == null)
			{
				return null;
			}

			return new PopulatedHistoryModel
			{
				Id = historyItem.Id,
				PlayedAt = historyItem.PlayedAt,
				GuildId = historyItem.GuildId,
				UserId = historyItem.UserId,
				VideoId = historyItem.VideoId,
				Video = video,
				ChannelId = historyItem.ChannelId,
				SessionId = historyItem.SessionId,
				Announced = historyItem.Announced,
				SkippedAt = historyItem.SkippedAt
			};

		}

		public async Task AmendAnnounceMessageId(string historyId, ObjectId announceMessageId)
		{
			HistoryModel history = await _historyCollection.Find(h => h.Id == ObjectId.Parse(historyId)).FirstOrDefaultAsync();
			history.AnnounceMessageId = announceMessageId;
			await _historyCollection.ReplaceOneAsync(h => h.Id == ObjectId.Parse(historyId), history);
		}
	}
}

