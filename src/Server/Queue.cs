using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using DSharpPlus.VoiceNext;
using Serilog;
using System;
using System.Threading.Tasks;
using Velody.MongoDBIntegration.Models;
using Velody.MongoDBIntegration.Repositories;
using Velody.Presenters;
using Velody.Utils;
using Velody.Video;

namespace Velody.Server
{
    public class Queue
    {
        private readonly string _sessionId;
        private const int DOWNLOAD_QUEUE_SIZE = 3;
        private readonly string _serverName;
        private readonly VideoHandler _videoHandler;
        private readonly ILogger _logger = Logger.CreateLogger("Queue");
        private List<VideoInfo> _queue = new List<VideoInfo>();
        private HistoryRepository _historyRepository;
        private VideoRepository _videoRepository;
        private ServerRepository _serverRepository;
        private Presenter _presenter;
        private Dictionary<string, string> _videoPaths = new Dictionary<string, string>();
        private string _isAnnouncementInProcess = string.Empty;
        private bool _isAnnouncementEnabled = true;
        public bool Loop = false;
        public bool LoopQueue = false;
        public event Func<string, int, Task>? PlayVideo;
        private string _guildId;

        public Queue(string serverName, string guildId, VideoHandler videoHandler, HistoryRepository historyRepository, VideoRepository videoRepository, ServerRepository serverRepository, Presenter presenter, string sessionId)
        {
            _serverName = serverName;
            _videoHandler = videoHandler;
            _historyRepository = historyRepository;
            _videoRepository = videoRepository;
            _serverRepository = serverRepository;
            _presenter = presenter;
            _sessionId = sessionId;
            _guildId = guildId;

            if (!Settings.PresenterEnabled)
            {
                _logger.Warning("Presenter is disabled by the bot owner");
                IsAnnouncementEnabled = false;
            }
            else
            {

                ServerModel? server = _serverRepository.GetServer(guildId).GetAwaiter().GetResult();
                if (server != null)
                {
                    IsAnnouncementEnabled = server.PresenterEnabled;
                }
                else
                {
                    _logger.Warning("Server {ServerName} not found in database. Creating...", _serverName);
                    _ = _serverRepository.InsertServer(guildId, _isAnnouncementEnabled);
                }
            }
        }

        public async Task AddToQueueAsync(VideoInfo videoInfo, bool addFirst = false)
        {
            if (addFirst && _queue.Count > 1)
            {
                _queue.Insert(1, videoInfo);
                _logger.Information("Added video {VideoTitle} to the front of the queue for server {ServerName}", videoInfo.Title, _serverName);
            }
            else
            {
                _queue.Add(videoInfo);
                _logger.Information("Added video {VideoTitle} to the queue for server {ServerName}", videoInfo.Title, _serverName);
            }

            if (_queue.Count == 1)
            {
                await DownloadVideoAsync(videoInfo);
                if (_videoPaths.ContainsKey(videoInfo.VideoId))
                {
                    _ = PlayNextVideoAsync();
                }
            }
        }

        private async Task DownloadTopQueueAsync()
        {
            for (int i = 1; i < Math.Min(DOWNLOAD_QUEUE_SIZE, _queue.Count); i++)
            {
                if (!_videoPaths.ContainsKey(_queue[i].VideoId))
                {
                    _logger.Information("Downloading video {VideoTitle} to play next", _queue[i].Title);
                    await DownloadVideoAsync(_queue[i]);
                }
            }
        }

        public async Task AddToQueueAsync(VideoInfo[] videoInfos)
        {
            foreach (VideoInfo videoInfo in videoInfos)
            {
                await AddToQueueAsync(videoInfo);
            }

            _ = DownloadTopQueueAsync();
        }

        public bool IsQueueEmpty()
        {
            return _queue.Count == 0;
        }

        public void HandlePlaybackFinished(bool isSkip)
        {
            if (IsAnnouncementInProcess && !isSkip)
            {
                _logger.Information("Announcement finished, playing next video");
                return;
            }

            if (_queue.Count == 0)
            {
                _logger.Warning("Playback finished but queue is empty");
                return;
            }

            if (isSkip)
            {
                _isAnnouncementInProcess = string.Empty;
            }

            if (Loop)
            {
                _logger.Information("Looping currently playing video");
                return;
            }

            if (LoopQueue)
            {
                _logger.Information("Looping queue");
                _queue.Add(_queue[0]);
            }

            _queue.RemoveAt(0);
            _logger.Information("Removed video from queue, {QueueLength} videos left in queue", _queue.Count);
        }

        public async Task PlayNextVideoAsync()
        {
            VideoInfo videoInfo = _queue[0];

            if (!_videoPaths.ContainsKey(videoInfo.VideoId))
            {
                _logger.Information("Downloading video {VideoTitle} to play next", videoInfo.Title);
                await DownloadVideoAsync(videoInfo);
            }

            _ = DownloadTopQueueAsync();

            VideoModel? video = await _videoRepository.GetVideo(videoInfo.VideoId, videoInfo.Service);
            if (video != null && (!IsAnnouncementInProcess))
            {
                bool isAnnounced = IsAnnouncementEnabled;
                int announcePercentage = Settings.AnnouncePercentage;
                if (announcePercentage < 0 || announcePercentage > 100)
                {
                    _logger.Warning("Invalid announce percentage {AnnouncePercentage}. Using default of 100%.", announcePercentage);
                    announcePercentage = 100;
                }
                else
                {
                    _logger.Information("Announce percentage set to {AnnouncePercentage}%", announcePercentage);
                }

                if (isAnnounced)
                {
                    int count = await _historyRepository.GetHistoryCount(_sessionId);
                    if (count == 0)
                    {
                        _logger.Information("No history found, announcing first video");
                    }
                    else
                    {
                        isAnnounced = new Random().Next(100) < announcePercentage;
                        _logger.Information("Announcing next video: {IsAnnounced}", isAnnounced);

                    }

                }

                string historyId = await _historyRepository.InsertHistory(video.Id, videoInfo.UserId, videoInfo.GuildId, videoInfo.ChannelId, _sessionId, isAnnounced);
                AddMongoIdToQueueEntry(videoInfo.VideoId, historyId);
                _logger.Information("Inserted history for video {VideoId}", video.Id);


                if (isAnnounced)
                {
                    _isAnnouncementInProcess = videoInfo.VideoId;
                    _logger.Information("Announcing next video {VideoTitle}", videoInfo.Title);
                    string announcementPath = await _presenter.DownloadNextAnnouncementAsync(videoInfo, _sessionId, historyId);
                    _logger.Information("Announcement downloaded for video {VideoTitle}", videoInfo.Title);
                    PlayVideo?.Invoke(announcementPath, 3);

                    return;
                }
            }

            _isAnnouncementInProcess = string.Empty;

            _logger.Information("Playing next video in queue {VideoTitle}", videoInfo.Title);
            PlayVideo?.Invoke(_videoPaths[videoInfo.VideoId], 1);
        }

        public async Task PlayLeaveAnnouncementAsync()
        {
            _logger.Information("Announcing leave");
            string announcementPath = await _presenter.DownloadLeaveAnnouncementAsync(_sessionId);
            PlayVideo?.Invoke(announcementPath, 3);
        }

        private async Task DownloadVideoAsync(VideoInfo videoInfo)
        {
            string? videoPath = await _videoHandler.DownloadVideoAsync(videoInfo.Service, videoInfo.VideoId);
            if (videoPath == null)
            {
                _logger.Error("Failed to download video {VideoTitle}", videoInfo.Title);
                return;
            }

            _logger.Information("Downloaded video {VideoTitle} to {VideoPath}", videoInfo.Title, videoPath);
            _videoPaths[videoInfo.VideoId] = videoPath;
        }

        public void AddMongoIdToQueueEntry(string videoId, string mongoId)
        {
            _queue[0].HistoryId = mongoId;
            _logger.Information("Added history ID {HistoryId} to video {VideoId}", mongoId, videoId);
        }

        public List<VideoInfo> GetQueue()
        {
            return _queue;
        }

        public List<VideoInfo> GetQueue(int Limit, int Offset)
        {
            return _queue.Skip(Offset).Take(Limit).ToList();
        }

        public int GetQueueDuration()
        {
            return _queue.Sum(video => video.Duration);
        }

        public int GetQueueLength()
        {
            return _queue.Count;
        }

        public void ClearQueue()
        {
            _queue.RemoveRange(1, _queue.Count - 1);
            _logger.Information("Cleared queue for server {ServerName}", _serverName);
        }

        public void ShuffleQueue()
        {
            Random random = new Random();
            for (int i = 1; i < _queue.Count; i++)
            {
                int randomIndex = random.Next(i, _queue.Count);
                VideoInfo temp = _queue[i];
                _queue[i] = _queue[randomIndex];
                _queue[randomIndex] = temp;
            }

            _logger.Information("Shuffled queue for server {ServerName}", _serverName);
        }

        public VideoInfo RemoveVideo(int index)
        {
            if (index <= 0 || index >= _queue.Count)
            {
                throw new ArgumentOutOfRangeException(nameof(index));
            }

            VideoInfo video = _queue[index];
            _queue.RemoveAt(index);
            _logger.Information("Removed video {VideoTitle} from queue for server {ServerName}", video.Title, _serverName);
            return video;
        }

        public VideoInfo? CurrentlyPlaying
        {
            get
            {
                if (_queue.Count == 0)
                {
                    return null;
                }

                return _queue[0];
            }
        }
        public VideoInfo? GetNextVideo
        {
            get
            {
                if (_queue.Count < 2)
                {
                    return null;
                }

                return _queue[1];
            }
        }

        public bool IsAnnouncementInProcess
        {
            get => _queue.Count > 0 && _isAnnouncementInProcess == _queue[0].VideoId;
        }

        public bool IsAnnouncementEnabled
        {
            get => _isAnnouncementEnabled; set
            {

                _isAnnouncementEnabled = value;
                _logger.Information("Set announcement enabled to {IsAnnouncementEnabled} for server {ServerName}", _isAnnouncementEnabled, _serverName);
                _ = _serverRepository.UpdatePresenterEnabled(_guildId, _isAnnouncementEnabled);
            }
        }
    }
}
