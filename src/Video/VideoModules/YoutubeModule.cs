using System.Diagnostics;
using System.Web;
using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using Serilog;

namespace Velody
{
	public class YoutubeModule : BaseVideoModule
	{

		private readonly ILogger _logger = Logger.CreateLogger("YoutubeModule");

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

		public override Task<string> DownloadVideoAsync(string url)
		{
			string cachePath = "./cache/youtube";
			string? VideoId = UrlToId(url);

			string fullPath = $"{cachePath}/{VideoId}.mp3";

			if (File.Exists(fullPath))
			{
				return Task.FromResult(fullPath);
			}

			Process? ytDlp = Process.Start(new ProcessStartInfo
			{
				FileName = "yt-dlp",
				Arguments = $@"-o ""{fullPath}"" --audio-format mp3 --extract-audio --audio-quality 0 {url}",
				RedirectStandardOutput = true,
				UseShellExecute = false
			});

			if (ytDlp == null)
			{
				throw new Exception("Failed to start yt-dlp process");
			}

			ytDlp.WaitForExit();
			return Task.FromResult(fullPath);
		}

		public override async Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl)
		{
			if (IsYoutubePlaylistUrl(searchStringOrUrl))
			{
				return await GetPlaylistVideos(searchStringOrUrl);
			}
			else
			{
				VideoInfo? videoInfo = await GetSingleVideoInfo(searchStringOrUrl);
				return videoInfo != null ? new VideoInfo[] { videoInfo } : Array.Empty<VideoInfo>();
			}
		}

		private async Task<VideoInfo?> GetSingleVideoInfo(string searchString)
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
					Id = videoId,
					Title = videoSnippet.Title,
					Duration = 0,
					Url = $"https://www.youtube.com/watch?v={videoId}",
					Thumbnail = videoSnippet.Thumbnails.Maxres?.Url ?? videoSnippet.Thumbnails.Default__.Url,
					Service = VideoService.Youtube
				};
			}

			return null;
		}

		private async Task<VideoInfo[]> GetPlaylistVideos(string playlistUrl)
		{
			var playlistId = GetPlaylistIdFromUrl(playlistUrl);
			var playlistItemsListRequest = _youTubeService.PlaylistItems.List("snippet");
			playlistItemsListRequest.PlaylistId = playlistId;
			playlistItemsListRequest.MaxResults = 50;

			var playlistItemsListResponse = await playlistItemsListRequest.ExecuteAsync();
			var videos = new List<VideoInfo>();

			foreach (var playlistItem in playlistItemsListResponse.Items)
			{
				var videoId = playlistItem.Snippet.ResourceId.VideoId;
				var videoSnippet = playlistItem.Snippet;

				var videoInfo = new VideoInfo
				{
					Id = videoId,
					Title = videoSnippet.Title,
					Duration = 0,
					Url = $"https://www.youtube.com/watch?v={videoId}",
					Thumbnail = videoSnippet.Thumbnails.Default__.Url,
					Service = VideoService.Youtube
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

		private static string? UrlToId(string url)
		{
			var uri = new Uri(url);
			var query = HttpUtility.ParseQueryString(uri.Query);
			return query["v"];
		}
	}
}
