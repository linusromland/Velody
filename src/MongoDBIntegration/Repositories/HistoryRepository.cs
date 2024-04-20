using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Velody
{
	public class HistoryRepository
	{
		private readonly IMongoCollection<History> _historyCollection;

		public HistoryRepository(MongoDBHelper mongoDBHelper)
		{
			_historyCollection = mongoDBHelper.GetCollection<History>("history");
		}

		public async Task InsertHistory(ObjectId videoId, string userId, string guildId, bool announced, ObjectId? announceMessageId)
		{
			History history = new History
			{
				PlayedAt = DateTime.UtcNow,
				UserId = userId,
				GuildId = guildId,
				VideoId = videoId,
				Announced = announced,
				AnnounceMessageId = announceMessageId
			};

			await _historyCollection.InsertOneAsync(history);
		}
	}
}

