using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Velody.Video;

namespace Velody.MongoDBIntegration.Models
{
	public class ServerModel
	{
		[BsonId]
		public ObjectId Id { get; set; }
		public required DateTime CreatedAt { get; set; }
		public required DateTime UpdatedAt { get; set; }
		public required string GuildId { get; set; }
		public required bool PresenterEnabled { get; set; }
	}
}
