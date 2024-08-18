using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;
using Velody.MongoDBIntegration.Models;

namespace Velody.MongoDBIntegration.Repositories
{
	public class CacheRepository
	{
		private readonly IMongoCollection<CacheModel> _cacheCollection;

		public CacheRepository(MongoDBHelper mongoDBHelper)
		{
			_cacheCollection = mongoDBHelper.GetCollection<CacheModel>("cache");
		}

		public async Task InsertCache(ObjectId videoId, string path)
		{
			CacheModel cache = new CacheModel
			{
				DownloadedAt = DateTime.UtcNow,
				VideoId = videoId,
				Path = path,
				IsRemoved = false
			};
			await _cacheCollection.InsertOneAsync(cache);
		}

		public async Task<string?> GetPath(ObjectId videoId)
		{
			List<CacheModel> caches = await _cacheCollection.Find(c => c.VideoId == videoId && c.IsRemoved == false).Limit(1).ToListAsync();

			return caches.Count > 0 ? caches[0].Path : null;
		}

		public async Task RemoveCache(ObjectId videoId)
		{
			await _cacheCollection.UpdateOneAsync(c => c.VideoId == videoId, Builders<CacheModel>.Update.Set(c => c.IsRemoved, true).Set(c => c.RemovedAt, DateTime.UtcNow));
		}
		public async Task RemoveCache(string filename)
		{
			await _cacheCollection.UpdateOneAsync(c => c.Path.Contains(filename), Builders<CacheModel>.Update.Set(c => c.IsRemoved, true).Set(c => c.RemovedAt, DateTime.UtcNow));
		}
	}
}

