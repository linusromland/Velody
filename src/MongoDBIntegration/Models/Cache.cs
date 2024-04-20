using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Velody
{
	public class Cache
	{
		[BsonId]
		public ObjectId Id { get; set; }
		public required DateTime DownloadedAt { get; set; }
		public DateTime? RemovedAt { get; set; }
		public required string Path { get; set; }
		public required bool IsRemoved { get; set; }
		public required ObjectId VideoId { get; set; }
	}
}
