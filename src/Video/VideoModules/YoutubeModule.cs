using System.Diagnostics;
using System.Web;
using System.Xml;
using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using MongoDB.Bson;
using Serilog;
using Velody.Utils;

namespace Velody.Video.VideoModules
{
    public class YoutubeModule : BaseVideoModule
    {

        private static readonly ILogger _logger = Logger.CreateLogger("YoutubeModule");

        private readonly YouTubeService _youTubeService;

        public YoutubeModule()
        {
            _youTubeService = new YouTubeService(new BaseClientService.Initializer()
            {
                ApiKey = Settings.GoogleApiKey,
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
                _logger.Error("Failed to start yt-dlp process");
                throw new Exception("Failed to start yt-dlp process");
            }

            ytDlp.WaitForExit();
            return Task.FromResult(path);
        }

        public override async Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl, string guildId, string userId, string channelId)
        {

            if (IsYoutubePlaylistUrl(searchStringOrUrl))
            {
                return await GetPlaylistVideos(searchStringOrUrl, guildId, userId, channelId);
            }
            else
            {
                VideoInfo? videoInfo = await GetSingleVideoInfo(searchStringOrUrl, guildId, userId, channelId);
                if (videoInfo != null)
                {
                    return new VideoInfo[] { videoInfo };
                }
                return Array.Empty<VideoInfo>();
            }
        }

        private async Task<VideoInfo?> GetSingleVideoInfo(string searchString, string guildId, string userId, string channelId)
        {
            bool isUrl = Uri.TryCreate(searchString, UriKind.Absolute, out Uri? uriResult) && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
            string? extractedId = isUrl && uriResult != null ? HttpUtility.ParseQueryString(uriResult.Query).Get("v") : searchString;
            if (isUrl && extractedId == null)
            {
                return null;
            }

            SearchResource.ListRequest? searchListRequest = _youTubeService.Search.List("id");
            searchListRequest.Type = "video";
            searchListRequest.Q = isUrl ? extractedId : searchString;
            searchListRequest.MaxResults = 1;

            Google.Apis.YouTube.v3.Data.SearchListResponse? searchListResponse = await searchListRequest.ExecuteAsync();

            if (searchListResponse.Items.Count > 0)
            {
                string? videoId = searchListResponse.Items[0].Id.VideoId;

                VideosResource.ListRequest videoListRequest = _youTubeService.Videos.List("contentDetails,snippet,id");
                videoListRequest.Id = videoId;
                Google.Apis.YouTube.v3.Data.VideoListResponse videoListResponse = await videoListRequest.ExecuteAsync();
                Google.Apis.YouTube.v3.Data.Video video = videoListResponse.Items[0];

                return new VideoInfo
                {
                    VideoId = videoId,
                    Title = video.Snippet.Title,
                    Duration = (int)XmlConvert.ToTimeSpan(video.ContentDetails.Duration).TotalSeconds,
                    Url = IdToURL(videoId),
                    Thumbnail = video.Snippet.Thumbnails.Maxres?.Url ?? video.Snippet.Thumbnails.Default__.Url,
                    Service = VideoService.Youtube,
                    GuildId = guildId,
                    UserId = userId,
                    ChannelId = channelId
                };
            }

            return null;
        }

        private async Task<VideoInfo[]> GetPlaylistVideos(string playlistUrl, string guildId, string userId, string channelId)
        {
            string? playlistId = GetPlaylistIdFromUrl(playlistUrl);
            PlaylistItemsResource.ListRequest? playlistItemsListRequest = _youTubeService.PlaylistItems.List("id,snippet");
            playlistItemsListRequest.PlaylistId = playlistId;
            playlistItemsListRequest.MaxResults = 50;

            Google.Apis.YouTube.v3.Data.PlaylistItemListResponse? playlistItemsListResponse = await playlistItemsListRequest.ExecuteAsync();
            List<VideoInfo>? videos = new List<VideoInfo>();
            List<string> videoIds = playlistItemsListResponse.Items.Select(playlistItem => playlistItem.Snippet.ResourceId.VideoId).ToList();

            VideosResource.ListRequest videoListRequest = _youTubeService.Videos.List("contentDetails,snippet");
            videoListRequest.Id = string.Join(",", videoIds);
            Google.Apis.YouTube.v3.Data.VideoListResponse videoListResponse = await videoListRequest.ExecuteAsync();

            foreach (Google.Apis.YouTube.v3.Data.Video video in videoListResponse.Items)
            {
                string? videoId = video.Id;
                Google.Apis.YouTube.v3.Data.VideoSnippet? videoSnippet = video.Snippet;

                VideoInfo videoInfo = new VideoInfo
                {
                    VideoId = videoId,
                    Title = videoSnippet.Title,
                    Duration = (int)XmlConvert.ToTimeSpan(video.ContentDetails.Duration).TotalSeconds,
                    Url = IdToURL(videoId),
                    Thumbnail = videoSnippet.Thumbnails.Maxres?.Url ?? videoSnippet.Thumbnails.Default__.Url,
                    Service = VideoService.Youtube,
                    GuildId = guildId,
                    UserId = userId,
                    ChannelId = channelId
                };

                videos.Add(videoInfo);
            }


            return videos.ToArray();
        }

        private static bool IsYoutubePlaylistUrl(string url)
        {
            return url.Contains("playlist") && url != String.Empty;
        }

        private static string? GetPlaylistIdFromUrl(string playlistUrl)
        {
            var uri = new Uri(playlistUrl);
            var query = HttpUtility.ParseQueryString(uri.Query);
            return query["list"];
        }

        private static string IdToURL(string id)
        {
            return $"https://www.youtube.com/watch?v={id}";
        }
    }
}
