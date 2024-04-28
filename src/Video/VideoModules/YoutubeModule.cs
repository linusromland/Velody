using System.Diagnostics;
using System.Web;
using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using Velody.Utils;

namespace Velody.Video.VideoModules
{
	public class YoutubeModule : BaseVideoModule
	{

		private readonly YouTubeService _youTubeService;

		public YoutubeModule()
		{
			_youTubeService = new YouTubeService(new BaseClientService.Initializer()
			{
				ApiKey = Settings.YoutubeApiKey,
				ApplicationName = "Velody",
			});

			// Disable logging
			_youTubeService.HttpClient.MessageHandler.IsLoggingEnabled = false;
		}

		public override Task<string> DownloadVideoAsync(string videoId, string path)
		{
			Process? ytDlp = Process.Start(new ProcessStartInfo
			{
				FileName = "yt-dlp",
				Arguments = $@"-o ""{path}"" --audio-format mp3 --extract-audio --audio-quality 0 {IdToURL(videoId)}",
				RedirectStandardOutput = true,
				UseShellExecute = false
			});

			if (ytDlp == null)
			{
				throw new Exception("Failed to start yt-dlp process");
			}

			ytDlp.WaitForExit();
			return Task.FromResult(path);
		}

		public override async Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl, string guildId, string userId)
		{
			if (IsYoutubePlaylistUrl(searchStringOrUrl))
			{
				return await GetPlaylistVideos(searchStringOrUrl, guildId, userId);
			}
			else
			{
				VideoInfo? videoInfo = await GetSingleVideoInfo(searchStringOrUrl, guildId, userId);
				if (videoInfo != null)
				{
					return new VideoInfo[] { videoInfo };
				}
				return Array.Empty<VideoInfo>();
			}
		}

		private async Task<VideoInfo?> GetSingleVideoInfo(string searchString, string guildId, string userId)
		{
			var searchListRequest = _youTubeService.Search.List("snippet");
			searchListRequest.Q = searchString;
			searchListRequest.MaxResults = 1;

			var searchListResponse = await searchListRequest.ExecuteAsync();

			if (searchListResponse.Items.Count > 0)
			{
				var videoId = searchListResponse.Items[0].Id.VideoId;
				var videoSnippet = searchListResponse.Items[0].Snippet;

				return new VideoInfo
				{
					VideoId = videoId,
					Title = videoSnippet.Title,
					Duration = 0,
					Url = $"https://www.youtube.com/watch?v={videoId}",
					Thumbnail = videoSnippet.Thumbnails.Maxres?.Url ?? videoSnippet.Thumbnails.Default__.Url,
					Service = VideoService.Youtube,
					GuildId = guildId,
					UserId = userId
				};
			}

			return null;
		}

		private async Task<VideoInfo[]> GetPlaylistVideos(string playlistUrl, string guildId, string userId)
		{
			string? playlistId = GetPlaylistIdFromUrl(playlistUrl);
			PlaylistItemsResource.ListRequest? playlistItemsListRequest = _youTubeService.PlaylistItems.List("snippet");
			playlistItemsListRequest.PlaylistId = playlistId;
			playlistItemsListRequest.MaxResults = 50;

			Google.Apis.YouTube.v3.Data.PlaylistItemListResponse? playlistItemsListResponse = await playlistItemsListRequest.ExecuteAsync();
			List<VideoInfo>? videos = new List<VideoInfo>();

			foreach (Google.Apis.YouTube.v3.Data.PlaylistItem? playlistItem in playlistItemsListResponse.Items)
			{
				string? videoId = playlistItem.Snippet.ResourceId.VideoId;
				Google.Apis.YouTube.v3.Data.PlaylistItemSnippet? videoSnippet = playlistItem.Snippet;
				int duration = playlistItem.ContentDetails.DurationInSeconds ?? 0;

				VideoInfo videoInfo = new VideoInfo
				{
					VideoId = videoId,
					Title = videoSnippet.Title,
					Duration = 0,
					Url = $"https://www.youtube.com/watch?v={videoId}",
					Thumbnail = videoSnippet.Thumbnails.Default__.Url,
					Service = VideoService.Youtube,
					GuildId = guildId,
					UserId = userId
				};

				videos.Add(videoInfo);
			}

			return videos.ToArray();
		}

		private static bool IsYoutubePlaylistUrl(string url)
		{
			return url.Contains("playlist");
		}

		private static string? GetPlaylistIdFromUrl(string playlistUrl)
		{
			var uri = new Uri(playlistUrl);
			var query = HttpUtility.ParseQueryString(uri.Query);
			return query["list"];
		}

		private static string? IdToURL(string id)
		{
			return $"https://www.youtube.com/watch?v={id}";
		}
	}
}
