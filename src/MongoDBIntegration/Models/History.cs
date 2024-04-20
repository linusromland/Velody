using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Velody
{
	public class History
	{
		[BsonId]
		public ObjectId Id { get; set; }
		public required DateTime PlayedAt { get; set; }
		public required string GuildId { get; set; }
		public required string UserId { get; set; }
		public required ObjectId VideoId { get; set; }
		public required bool Announced { get; set; }
		public ObjectId? AnnounceMessageId { get; set; }
	}
}
