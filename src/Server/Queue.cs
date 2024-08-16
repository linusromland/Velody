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
	public class Queue(string serverName, VideoHandler videoHandler, HistoryRepository historyRepository, VideoRepository videoRepository, Presenter presenter)
	{
		private const int DOWNLOAD_QUEUE_SIZE = 3;
		private readonly string _serverName = serverName;
		private readonly VideoHandler _videoHandler = videoHandler;
		private readonly ILogger _logger = Logger.CreateLogger("Queue");
		private List<VideoInfo> _queue = new List<VideoInfo>();
		private HistoryRepository _historyRepository = historyRepository;
		private VideoRepository _videoRepository = videoRepository;
		private Presenter _presenter = presenter;
		private Dictionary<string, string> _videoPaths = new Dictionary<string, string>();
		private string _isAnnouncementInProcess = string.Empty;
		private bool _isAnnouncementEnabled = true; // TODO: Add setting for this
		public event Func<string, Task>? PlaySong;

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
					_ = PlayNextSongAsync();
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

		public void HandlePlaybackFinished()
		{
			if (IsAnnouncementInProcess)
			{
				_logger.Information("Announcement finished, playing next song");
				return;
			}

			if (_queue.Count == 0)
			{
				_logger.Warning("Playback finished but queue is empty");
				return;
			}

			_queue.RemoveAt(0);
			_logger.Information("Removed video from queue, {QueueLength} videos left in queue", _queue.Count);
		}

		public async Task PlayNextSongAsync()
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
				string historyId = await _historyRepository.InsertHistory(video.Id, videoInfo.GuildId, videoInfo.UserId, false, null);
				AddMongoIdToQueueEntry(videoInfo.VideoId, historyId);
				_logger.Information("Inserted history for video {VideoId}", video.Id);


				if (_isAnnouncementEnabled)
				{
					_isAnnouncementInProcess = videoInfo.VideoId;
					_logger.Information("Announcing next song {VideoTitle}", videoInfo.Title);
					string announcementPath = await _presenter.DownloadNextAnnouncementAsync(videoInfo);
					_logger.Information("Announcement downloaded for video {VideoTitle}", videoInfo.Title);
					PlaySong?.Invoke(announcementPath);

					return;
				}
			}

			_isAnnouncementInProcess = string.Empty;

			_logger.Information("Playing next song in queue {VideoTitle}", videoInfo.Title);
			PlaySong?.Invoke(_videoPaths[videoInfo.VideoId]);
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
			get => _isAnnouncementInProcess == _queue[0].VideoId;
		}
	}
}
