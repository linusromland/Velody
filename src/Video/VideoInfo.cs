namespace Velody.Video
{
	public enum VideoService
	{
		Youtube
	}

	public class VideoInfo
	{
		public required string VideoId { get; set; }
		public required string Title { get; set; }
		public required int Duration { get; set; }
		public required string Url { get; set; }
		public required string Thumbnail { get; set; }
		public required VideoService Service { get; set; }
		public required string GuildId { get; set; }
		public required string UserId { get; set; }
		public string? HistoryId { get; set; }
	}
}