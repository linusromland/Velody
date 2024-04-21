using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Velody.Video;

namespace Velody.MongoDBIntegration.Models
{
	public class VideoModel
	{
		[BsonId]
		public ObjectId Id { get; set; }
		public required DateTime CreatedAt { get; set; }
		public required DateTime UpdatedAt { get; set; }
		public required VideoService VideoService { get; set; }
		public required string VideoId { get; set; }
		public required string Title { get; set; }
		public required int Duration { get; set; }
		public required string Url { get; set; }
		public required string Thumbnail { get; set; }
	}
}
