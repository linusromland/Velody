using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Velody.MongoDBIntegration.Models
{
	public class AnnounceMessageModel
	{
		[BsonId]
		public ObjectId Id { get; set; }
		public required DateTime PlayedAt { get; set; }
		public required string GuildId { get; set; }
		public required ObjectId HistoryId { get; set; }
		public required string Message { get; set; }
		public required string AnnounceService { get; set; }
	}
}
