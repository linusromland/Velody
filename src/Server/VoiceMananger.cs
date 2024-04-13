using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using DSharpPlus.VoiceNext;
using Serilog;
using System;
using System.Threading.Tasks;

namespace Velody
{
	public class VoiceManager
	{

		private readonly ILogger _logger = Logger.CreateLogger("VoiceManager");

		private readonly DiscordClient _client;

		private VoiceNextConnection? _vnc;

		public event Func<Task>? PlaybackFinished;

		public VoiceManager(DiscordClient client)
		{
			_client = client;

			if (_client.GetVoiceNext() == null)
			{
				throw new InvalidOperationException("Voice is not enabled for this client.");
			}
		}


		public async Task JoinVoiceChannelAsync(DiscordChannel voiceChannel)
		{
			if (voiceChannel.Type != ChannelType.Voice)
			{
				throw new ArgumentException("Specified channel is not a voice channel.");
			}

			VoiceNextExtension vnext = _client.GetVoiceNext();
			_vnc = vnext.GetConnection(voiceChannel.Guild);

			if (_vnc != null)
			{
				throw new InvalidOperationException("Already connected to a voice channel in this guild.");
			}

			_vnc = await vnext.ConnectAsync(voiceChannel);

		}

		public async Task PlayAudioAsync(string path)
		{
			if (_vnc == null)
			{
				throw new InvalidOperationException("Not connected to a voice channel.");
			}

			await _vnc.SendSpeakingAsync(true);

			Stream? fileStream = FFmpeg.GetFileStream(path);
			if (fileStream == null)
			{
				throw new InvalidOperationException("Failed to get file stream.");
			}

			_logger.Information("Playing audio from {Path}", path);

			VoiceTransmitSink transmit = _vnc.GetTransmitSink();
			await fileStream.CopyToAsync(transmit);
			await fileStream.DisposeAsync();

			_logger.Information("Finished playing audio from {Path}", path);

			await _vnc.SendSpeakingAsync(false);
		}

		public void LeaveVoiceChannel()
		{
			if (_vnc == null)
			{
				throw new InvalidOperationException("Not connected to a voice channel.");
			}

			_vnc.Disconnect();
			_vnc = null;
		}

		public bool IsConnectedToVoice()
		{

			return _vnc != null;
		}
	}
}
