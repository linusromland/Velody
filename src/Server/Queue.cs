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

		public event Func<string, Task>? PlaySong;

		// TODO: Add support for playlist
		public async Task AddToQueueAsync(VideoInfo videoInfo)
		{
			bool isQueueEmpty = _queue.Count == 0;
			_queue.Add(videoInfo);
			_logger.Information("Added video {VideoTitle} to the queue for server {ServerName}", videoInfo.Title, _serverName);

			if (isQueueEmpty)
			{
				string? videoPath = await DownloadVideoAsync(videoInfo);
				if (videoPath == null)
				{
					_logger.Error("Failed to download video {VideoTitle}", videoInfo.Title);
					return;
				}

				PlayNextSong(videoPath);
			}
		}

		public void PlayNextSong(string videoPath)
		{
			VideoInfo videoInfo = _queue[0];
			_queue.RemoveAt(0);

			if (_queue.Count > 0)
			{
				_logger.Information("Downloading next video in queue {VideoTitle}", _queue[0].Title);
				_ = DownloadVideoAsync(_queue[0]);
			}

			PlaySong?.Invoke(videoPath);
		}

		public async Task<string?> DownloadVideoAsync(VideoInfo videoInfo)
		{
			BaseVideoModule? videoModule;

			switch (videoInfo.Service)
			{
				case VideoService.Youtube:
					videoModule = _videoHandler.GetYoutubeModule();
					break;
				default:
					_logger.Error("Video service {VideoService} not supported", videoInfo.Service);
					return null;
			}

			string videoPath = await videoModule.DownloadVideoAsync(videoInfo.Url);
			_logger.Information("Downloaded video {VideoTitle} to {VideoPath}", videoInfo.Title, videoPath);
			return videoPath;
		}
	}
}
