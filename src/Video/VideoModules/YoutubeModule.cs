using System.Diagnostics;
using System.Text.RegularExpressions;
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
            _logger.Information("Initializing YoutubeModule...");

            _youTubeService = new YouTubeService(new BaseClientService.Initializer()
            {
                ApiKey = Settings.GoogleApiKey,
                ApplicationName = "Velody",
            });

            _logger.Information("YouTubeService created with API Key length: {KeyLength}, ApplicationName: {AppName}",
                Settings.GoogleApiKey?.Length, "Velody");

            _youTubeService.HttpClient.MessageHandler.IsLoggingEnabled = false;
            _logger.Debug("YouTubeService HttpClient logging disabled.");
        }

        public override Task<string> DownloadVideoAsync(string videoId, string path)
        {
            _logger.Information("Downloading video {VideoId} from YouTube to path {Path}", videoId, path);

            Process? ytDlp = Process.Start(new ProcessStartInfo
            {
                FileName = "yt-dlp",
                Arguments = $@"-o ""{path}"" --audio-format mp3 --extract-audio --audio-quality 0 {IdToURL(videoId)}",
                RedirectStandardOutput = true,
                UseShellExecute = false
            });

            if (ytDlp == null)
            {
                _logger.Error("Failed to start yt-dlp process for VideoId: {VideoId}", videoId);
                throw new Exception("Failed to start yt-dlp process");
            }

            _logger.Debug("yt-dlp process started with PID {Pid}", ytDlp.Id);

            ytDlp.WaitForExit();
            _logger.Information("yt-dlp process exited with code {ExitCode}", ytDlp.ExitCode);

            return Task.FromResult(path);
        }

        public override async Task<VideoInfo[]> GetVideoInfo(string searchStringOrUrl, string guildId, string userId, string channelId)
        {
            _logger.Information("Fetching video info for input: {Input}", searchStringOrUrl);

            if (IsYoutubePlaylistUrl(searchStringOrUrl))
            {
                _logger.Debug("Detected YouTube playlist URL: {Url}", searchStringOrUrl);
                return await GetPlaylistVideos(searchStringOrUrl, guildId, userId, channelId);
            }
            else
            {
                _logger.Debug("Input is not a playlist URL, attempting single video fetch.");
                VideoInfo? videoInfo = await GetSingleVideoInfo(searchStringOrUrl, guildId, userId, channelId);

                if (videoInfo != null)
                {
                    _logger.Information("Single video info retrieved successfully for input: {Input}", searchStringOrUrl);
                    return new VideoInfo[] { videoInfo };
                }

                _logger.Warning("No video info found for input: {Input}", searchStringOrUrl);
                return Array.Empty<VideoInfo>();
            }
        }

        private async Task<VideoInfo?> GetSingleVideoInfo(string searchString, string guildId, string userId, string channelId)
        {
            _logger.Debug("GetSingleVideoInfo called with searchString: {SearchString}", searchString);

            if (string.IsNullOrWhiteSpace(searchString))
            {
                _logger.Warning("Search string was null or whitespace.");
                return null;
            }

            bool isUrl = Uri.TryCreate(searchString, UriKind.Absolute, out Uri? uriResult) &&
                         (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
            _logger.Debug("Is search string a valid URL? {IsUrl}", isUrl);

            if (isUrl && uriResult is not null && IsYouTubeHost(uriResult))
            {
                _logger.Debug("Detected YouTube host: {Host}", uriResult.Host);
                string? videoId = ExtractYouTubeVideoId(uriResult);
                _logger.Debug("Extracted video ID: {VideoId}", videoId);

                if (string.IsNullOrEmpty(videoId))
                {
                    _logger.Warning("Could not extract video ID from URL: {Url}", uriResult);
                    return null;
                }

                _logger.Information("Fetching video details for VideoId: {VideoId}", videoId);
                VideosResource.ListRequest videoListRequest = _youTubeService.Videos.List("contentDetails,snippet,id");
                videoListRequest.Id = videoId;
                Google.Apis.YouTube.v3.Data.VideoListResponse videoListResponse = await videoListRequest.ExecuteAsync();

                if (videoListResponse?.Items == null || videoListResponse.Items.Count == 0)
                {
                    _logger.Warning("No video found for VideoId: {VideoId}", videoId);
                    return null;
                }

                Google.Apis.YouTube.v3.Data.Video video = videoListResponse.Items[0];
                _logger.Debug("Fetched video: {Title} ({DurationSeconds} seconds)", video.Snippet.Title,
                    (int)XmlConvert.ToTimeSpan(video.ContentDetails.Duration).TotalSeconds);

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

            _logger.Information("Performing YouTube search for query: {Query}", searchString);
            SearchResource.ListRequest searchListRequest = _youTubeService.Search.List("id");
            searchListRequest.Type = "video";
            searchListRequest.Q = searchString;
            searchListRequest.MaxResults = 1;

            Google.Apis.YouTube.v3.Data.SearchListResponse searchListResponse = await searchListRequest.ExecuteAsync();
            _logger.Debug("Search returned {Count} results", searchListResponse.Items.Count);

            if (searchListResponse.Items.Count > 0)
            {
                string? videoId = searchListResponse.Items[0].Id.VideoId;
                _logger.Debug("Using first search result VideoId: {VideoId}", videoId);

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

            _logger.Warning("No results found for search query: {Query}", searchString);
            return null;
        }

        private static bool IsYouTubeHost(Uri uri)
        {
            var host = uri.Host.ToLowerInvariant();
            bool isYouTube = host.Contains("youtube.com") || host.Contains("youtu.be") || host.Contains("youtube-nocookie.com");
            _logger.Debug("IsYouTubeHost check for {Host}: {Result}", host, isYouTube);
            return isYouTube;
        }

        private static string? ExtractYouTubeVideoId(Uri uri)
        {
            _logger.Debug("Attempting to extract YouTube video ID from URI: {Uri}", uri);

            var q = HttpUtility.ParseQueryString(uri.Query);
            var v = q.Get("v");
            if (!string.IsNullOrEmpty(v) && IsLikelyVideoId(v))
            {
                _logger.Debug("Video ID found in query parameter 'v': {VideoId}", v);
                return v;
            }

            if (uri.Host.EndsWith("youtu.be", StringComparison.OrdinalIgnoreCase))
            {
                var id = uri.AbsolutePath.Trim('/');
                if (IsLikelyVideoId(id))
                {
                    _logger.Debug("Video ID found in youtu.be path: {VideoId}", id);
                    return id;
                }
            }

            var segments = uri.AbsolutePath.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length > 0)
            {
                for (int i = 0; i < segments.Length; i++)
                {
                    var seg = segments[i].ToLowerInvariant();
                    if (seg == "embed" || seg == "v" || seg == "shorts")
                    {
                        if (i + 1 < segments.Length)
                        {
                            var candidate = segments[i + 1];
                            if (IsLikelyVideoId(candidate))
                            {
                                _logger.Debug("Video ID found in path segment after '{Segment}': {VideoId}", seg, candidate);
                                return candidate;
                            }
                        }
                    }
                }
                var last = segments[^1];
                if (IsLikelyVideoId(last))
                {
                    _logger.Debug("Video ID found as last path segment: {VideoId}", last);
                    return last;
                }
            }

            _logger.Warning("Failed to extract YouTube video ID from URI: {Uri}", uri);
            return null;
        }

        private static bool IsLikelyVideoId(string id)
        {
            bool match = Regex.IsMatch(id ?? string.Empty, @"^[A-Za-z0-9_-]{11}$");
            _logger.Debug("IsLikelyVideoId check for '{Id}': {Result}", id, match);
            return match;
        }

        private async Task<VideoInfo[]> GetPlaylistVideos(string playlistUrl, string guildId, string userId, string channelId)
        {
            _logger.Information("Fetching playlist videos from URL: {PlaylistUrl}", playlistUrl);

            string? playlistId = GetPlaylistIdFromUrl(playlistUrl);
            _logger.Debug("Extracted PlaylistId: {PlaylistId}", playlistId);

            if (string.IsNullOrEmpty(playlistId))
            {
                _logger.Warning("No playlist ID could be extracted from URL: {Url}", playlistUrl);
                return Array.Empty<VideoInfo>();
            }

            PlaylistItemsResource.ListRequest playlistItemsListRequest = _youTubeService.PlaylistItems.List("id,snippet");
            playlistItemsListRequest.PlaylistId = playlistId;
            playlistItemsListRequest.MaxResults = 50;

            Google.Apis.YouTube.v3.Data.PlaylistItemListResponse playlistItemsListResponse = await playlistItemsListRequest.ExecuteAsync();
            _logger.Debug("Playlist contains {Count} items", playlistItemsListResponse.Items.Count);

            List<VideoInfo> videos = new List<VideoInfo>();
            List<string> videoIds = playlistItemsListResponse.Items.Select(playlistItem => playlistItem.Snippet.ResourceId.VideoId).ToList();

            _logger.Debug("Collected {Count} video IDs from playlist", videoIds.Count);

            VideosResource.ListRequest videoListRequest = _youTubeService.Videos.List("contentDetails,snippet");
            videoListRequest.Id = string.Join(",", videoIds);
            Google.Apis.YouTube.v3.Data.VideoListResponse videoListResponse = await videoListRequest.ExecuteAsync();

            foreach (Google.Apis.YouTube.v3.Data.Video video in videoListResponse.Items)
            {
                string? videoId = video.Id;
                _logger.Debug("Processing playlist video: {VideoId} - {Title}", videoId, video.Snippet.Title);

                Google.Apis.YouTube.v3.Data.VideoSnippet videoSnippet = video.Snippet;
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

            _logger.Information("Returning {Count} videos from playlist {PlaylistId}", videos.Count, playlistId);
            return videos.ToArray();
        }

        private static bool IsYoutubePlaylistUrl(string url)
        {
            _logger.Debug("Checking if URL is YouTube playlist: {Url}", url);

            if (!Uri.TryCreate(url, UriKind.Absolute, out Uri? uri))
            {
                _logger.Warning("Invalid playlist URL format: {Url}", url);
                return false;
            }

            var query = HttpUtility.ParseQueryString(uri.Query);
            bool result = !string.IsNullOrEmpty(query["list"]);
            _logger.Debug("Playlist URL check result for {Url}: {Result}", url, result);
            return result;
        }

        private static string? GetPlaylistIdFromUrl(string playlistUrl)
        {
            _logger.Debug("Extracting playlist ID from URL: {Url}", playlistUrl);

            if (!Uri.TryCreate(playlistUrl, UriKind.Absolute, out Uri? uri))
            {
                _logger.Warning("Invalid playlist URL format: {Url}", playlistUrl);
                return null;
            }

            var query = HttpUtility.ParseQueryString(uri.Query);
            var listId = query["list"];
            _logger.Debug("Extracted playlist ID: {ListId}", listId);
            return listId;
        }

        private static string IdToURL(string id)
        {
            var url = $"https://www.youtube.com/watch?v={id}";
            _logger.Debug("Converted VideoId {Id} to URL: {Url}", id, url);
            return url;
        }
    }
}
