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
	public class AnnounceMessageRepository
	{
		private readonly ILogger _logger = Logger.CreateLogger("AnnounceMessageRepository");
		private readonly IMongoCollection<AnnounceMessageModel> _announceMessageCollection;

		public AnnounceMessageRepository(MongoDBHelper mongoDBHelper)
		{
			_announceMessageCollection = mongoDBHelper.GetCollection<AnnounceMessageModel>("announceMessage");
		}

		public async Task<ObjectId> InsertAnnounceMessage(DateTime playedAt, string guildId, string channelId, string sessionId, string message, string announceService)
		{
			AnnounceMessageModel announceMessage = new AnnounceMessageModel
			{
				PlayedAt = playedAt,
				GuildId = guildId,
				Message = message,
				AnnounceService = announceService
			};

			await _announceMessageCollection.InsertOneAsync(announceMessage);
			return announceMessage.Id;
		}

		public async Task<AnnounceMessageModel?> GetAnnounceMessage(ObjectId? id)
		{
			if (id == null)
			{
				return null;
			}

			FilterDefinition<AnnounceMessageModel> filter = Builders<AnnounceMessageModel>.Filter.Eq(a => a.Id, id);
			return await _announceMessageCollection.Find(filter).FirstOrDefaultAsync();
		}
	}
}

