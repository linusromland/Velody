using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using DSharpPlus.VoiceNext;
using Serilog;
using System;
using System.Threading.Tasks;
using Velody.MongoDBIntegration.Models;
using Velody.MongoDBIntegration.Repositories;
using Velody.Utils;
using Velody.Video;

namespace Velody.Server
{
	public class Queue(string serverName, VideoHandler videoHandler, HistoryRepository historyRepository, VideoRepository videoRepository)
	{
		private readonly string _serverName = serverName;
		private readonly VideoHandler _videoHandler = videoHandler;
		private readonly ILogger _logger = Logger.CreateLogger("Queue");
		private List<VideoInfo> _queue = new List<VideoInfo>();
		private HistoryRepository _historyRepository = historyRepository;
		private VideoRepository _videoRepository = videoRepository;
		private Dictionary<string, string> _videoPaths = new Dictionary<string, string>();
		public event Func<string, Task>? PlaySong;

		public async Task AddToQueueAsync(VideoInfo videoInfo)
		{
			_queue.Add(videoInfo);
			_logger.Information("Added video {VideoTitle} to the queue for server {ServerName}", videoInfo.Title, _serverName);

			if (_queue.Count == 1)
			{
				await DownloadVideoAsync(videoInfo);
				if (_videoPaths.ContainsKey(videoInfo.VideoId))
				{
					_ = PlayNextSongAsync();
				}
			}


			if (_queue.Count == 2)
			{
				_ = DownloadVideoAsync(videoInfo);
			}
		}
		public async Task AddToQueueAsync(VideoInfo[] videoInfos)
		{
			foreach (VideoInfo videoInfo in videoInfos)
			{
				await AddToQueueAsync(videoInfo);
			}
		}

		public bool IsQueueEmpty()
		{
			return _queue.Count == 0;
		}

		public void HandlePlaybackFinished()
		{
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

			if (_queue.Count > 1 && !_videoPaths.ContainsKey(_queue[1].VideoId))
			{
				_logger.Information("Downloading next video in queue {VideoTitle}", _queue[1].Title);
				_ = DownloadVideoAsync(_queue[1]);
			}

			VideoModel? video = await _videoRepository.GetVideo(videoInfo.VideoId, videoInfo.Service);
			if (video != null)
			{
				// TODO: Add support for announcment here
				await _historyRepository.InsertHistory(video.Id, videoInfo.GuildId, videoInfo.UserId, false, null);
				_logger.Information("Inserted history for video {VideoId}", video.Id);
			}

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
	}
}
