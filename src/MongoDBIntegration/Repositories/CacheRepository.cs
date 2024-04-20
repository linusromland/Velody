using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Velody
{
	public class CacheRepository
	{
		private readonly IMongoCollection<Cache> _cacheCollection;

		public CacheRepository(MongoDBHelper mongoDBHelper)
		{
			_cacheCollection = mongoDBHelper.GetCollection<Cache>("cache");
		}

		public async Task InsertCache(ObjectId videoId, string path)
		{
			// TODO: Add videoId validation

			Cache cache = new Cache
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
			List<Cache> caches = await _cacheCollection.Find(c => c.VideoId == videoId && c.IsRemoved == false).Limit(1).ToListAsync();

			return caches.Count > 0 ? caches[0].Path : null;
		}

		public async Task RemoveCache(ObjectId videoId)
		{
			await _cacheCollection.UpdateOneAsync(c => c.VideoId == videoId, Builders<Cache>.Update.Set(c => c.IsRemoved, true).Set(c => c.RemovedAt, DateTime.UtcNow));
		}
	}
}

