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

		public HistoryRepository(MongoDBHelper mongoDBHelper)
		{
			_historyCollection = mongoDBHelper.GetCollection<HistoryModel>("history");
		}

		public async Task<string> InsertHistory(ObjectId videoId, string userId, string guildId, bool announced, ObjectId? announceMessageId)
		{
			HistoryModel history = new HistoryModel
			{
				PlayedAt = DateTime.UtcNow,
				UserId = userId,
				GuildId = guildId,
				VideoId = videoId,
				Announced = announced,
				AnnounceMessageId = announceMessageId
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
	}
}

