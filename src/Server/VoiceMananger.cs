using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.VoiceNext;
using Serilog;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Velody.Utils;

namespace Velody.Server
{
	public class VoiceManager
	{
		private readonly ILogger _logger = Logger.CreateLogger("VoiceManager");
		private readonly DiscordClient _client;
		private VoiceNextConnection? _vnc;
		private DateTime _playbackStartTime;
		private bool _isPlaying;
		private Thread? _playbackThread;
		private Stream? _fileStream;
		private CancellationTokenSource? _cancellationTokenSource;
		public event Func<Task>? PlaybackFinished;

		public VoiceManager(DiscordClient client)
		{
			_client = client;

			if (_client.GetVoiceNext() == null)
			{
				throw new InvalidOperationException("Voice is not enabled for this client.");
			}
		}

		public static DiscordChannel? GetVoiceChannel(DiscordVoiceState? voiceState)
		{
			try
			{
				DiscordChannel? voiceChannel = voiceState?.Channel;

				if (voiceChannel == null || voiceChannel.Type != ChannelType.Voice)
				{
					return null;
				}

				return voiceChannel;
			}
			catch (Exception)
			{
				return null;
			}
		}

		public enum JoinVoiceChannelResponseCode
		{
			Success,
			AlreadyConnected,
			UnknownError
		}

		public class JoinVoiceResponse
		{
			public JoinVoiceChannelResponseCode Code { get; set; }
			public string? VoiceChannelName { get; set; }
		}

		public async Task<JoinVoiceResponse> JoinVoiceChannelAsync(DiscordChannel voiceChannel)
		{
			try
			{
				VoiceNextExtension vnext = _client.GetVoiceNext();
				_vnc = vnext.GetConnection(voiceChannel.Guild);

				if (_vnc != null)
				{
					return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.AlreadyConnected, VoiceChannelName = voiceChannel.Name };
				}

				_vnc = await vnext.ConnectAsync(voiceChannel);
				return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.Success, VoiceChannelName = voiceChannel.Name };
			}
			catch (Exception e)
			{
				_logger.Error(e, "An unknown error occurred while trying to join the voice channel {VoiceChannelName}", voiceChannel.Name);
				return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.UnknownError };
			}
		}

		public void PlayAudio(string path)
		{
			if (_vnc == null)
			{
				throw new InvalidOperationException("Not connected to a voice channel.");
			}

			_cancellationTokenSource = new CancellationTokenSource();
			_playbackThread = new Thread(() => PlayAudioInternal(path, _cancellationTokenSource.Token));
			_playbackThread.Start();
		}

		private async void PlayAudioInternal(string path, CancellationToken cancellationToken)
		{
			if (_vnc == null)
			{
				throw new InvalidOperationException("Not connected to a voice channel.");
			}

			try
			{
				await _vnc.SendSpeakingAsync(true);

				_fileStream = FFmpeg.GetFileStream(path);
				if (_fileStream == null)
				{
					throw new InvalidOperationException("Failed to get file stream.");
				}

				_playbackStartTime = DateTime.UtcNow;
				_isPlaying = true;

				_logger.Information("Playing audio from {Path}", path);

				VoiceTransmitSink transmit = _vnc.GetTransmitSink();

				await _fileStream.CopyToAsync(transmit, 1024, cancellationToken);
				await transmit.FlushAsync(cancellationToken);

				_fileStream.Dispose();

				PlaybackFinished?.Invoke();
				_logger.Information("Finished playing audio from {Path}", path);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "An error occurred during audio playback.");
			}
			finally
			{
				await _vnc.SendSpeakingAsync(false);
				_isPlaying = false;
			}
		}

		public void StopAudio(bool shouldInvokeFinished = true)
		{
			if (_vnc == null)
			{
				throw new InvalidOperationException("Not connected to a voice channel.");
			}

			_cancellationTokenSource?.Cancel();

			if (_playbackThread != null && _playbackThread.IsAlive)
			{
				_playbackThread.Join();
			}

			_fileStream?.Dispose();
			_fileStream = null;
			_isPlaying = false;

			if (shouldInvokeFinished)
			{
				PlaybackFinished?.Invoke();
			}

			_logger.Information("Stopped audio playback.");
		}

		public TimeSpan GetPlaybackDuration()
		{
			if (!_isPlaying)
			{
				return TimeSpan.Zero;
			}

			return DateTime.UtcNow - _playbackStartTime;
		}

		public void LeaveVoiceChannel()
		{
			if (_vnc == null)
			{
				throw new InvalidOperationException("Not connected to a voice channel.");
			}

			StopAudio(false);

			_vnc.Disconnect();
			_vnc = null;
			_isPlaying = false;
		}

		public bool IsConnectedToVoice()
		{
			return _vnc != null;
		}
	}
}
