using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using DSharpPlus.VoiceNext;
using Serilog;
using System;
using System.Threading.Tasks;

namespace Velody
{
	public class Queue(string serverName, VideoHandler videoHandler)
	{
		private readonly string _serverName = serverName;
		private readonly VideoHandler _videoHandler = videoHandler;
		private readonly ILogger _logger = Logger.CreateLogger("Queue");
		private List<VideoInfo> _queue = new List<VideoInfo>();
		private Dictionary<string, string> _videoPaths = new Dictionary<string, string>();
		public event Func<string, Task>? PlaySong;

		// TODO: Make the download ahead configurable (e.g. download 2 videos ahead)
		// TODO: Add support for playlist
		public async Task AddToQueueAsync(VideoInfo videoInfo)
		{
			_queue.Add(videoInfo);
			_logger.Information("Added video {VideoTitle} to the queue for server {ServerName}", videoInfo.Title, _serverName);

			if (_queue.Count == 1)
			{
				await DownloadVideoAsync(videoInfo);
				if (_videoPaths.ContainsKey(videoInfo.Id))
				{
					_ = PlayNextSongAsync();
				}
			}
			else if (_queue.Count == 2)
			{
				_ = DownloadVideoAsync(videoInfo);
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

			if (!_videoPaths.ContainsKey(videoInfo.Id))
			{
				_logger.Information("Downloading video {VideoTitle} to play next", videoInfo.Title);
				await DownloadVideoAsync(videoInfo);
			}

			if (_queue.Count > 1 && !_videoPaths.ContainsKey(_queue[1].Id))
			{
				_logger.Information("Downloading next video in queue {VideoTitle}", _queue[1].Title);
				_ = DownloadVideoAsync(_queue[1]);
			}

			PlaySong?.Invoke(_videoPaths[videoInfo.Id]);
		}

		private async Task DownloadVideoAsync(VideoInfo videoInfo)
		{
			BaseVideoModule? videoModule;

			switch (videoInfo.Service)
			{
				case VideoService.Youtube:
					videoModule = _videoHandler.GetYoutubeModule();
					break;
				default:
					_logger.Error("Video service {VideoService} not supported", videoInfo.Service);
					return;
			}

			string videoPath = await videoModule.DownloadVideoAsync(videoInfo.Url);
			_logger.Information("Downloaded video {VideoTitle} to {VideoPath}", videoInfo.Title, videoPath);
			_videoPaths[videoInfo.Id] = videoPath;
		}
	}
}
