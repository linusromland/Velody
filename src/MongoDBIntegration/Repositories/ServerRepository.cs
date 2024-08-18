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
	public class ServerRepository
	{
		private readonly ILogger _logger = Logger.CreateLogger("ServerRepository");
		private readonly IMongoCollection<ServerModel> _serverCollection;

		public ServerRepository(MongoDBHelper mongoDBHelper)
		{
			_serverCollection = mongoDBHelper.GetCollection<ServerModel>("server");
		}

		public async Task<ObjectId> InsertServer(string guildId, bool presenterEnabled)
		{
			ServerModel server = new ServerModel
			{
				GuildId = guildId,
				PresenterEnabled = presenterEnabled,
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow
			};

			await _serverCollection.InsertOneAsync(server);
			return server.Id;
		}

		public async Task<ServerModel?> GetServer(string guildId)
		{
			FilterDefinition<ServerModel> filter = Builders<ServerModel>.Filter.Eq(a => a.GuildId, guildId);
			return await _serverCollection.Find(filter).FirstOrDefaultAsync();
		}

		public async Task UpdatePresenterEnabled(string guildId, bool presenterEnabled)
		{
			FilterDefinition<ServerModel> filter = Builders<ServerModel>.Filter.Eq(a => a.GuildId, guildId);
			UpdateDefinition<ServerModel> update = Builders<ServerModel>.Update.Set(a => a.PresenterEnabled, presenterEnabled).Set(a => a.UpdatedAt, DateTime.UtcNow);
			await _serverCollection.UpdateOneAsync(filter, update);
		}
	}
}

