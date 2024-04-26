using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using DSharpPlus.VoiceNext;
using Serilog;
using System;
using System.Threading.Tasks;
using Velody.Utils;

namespace Velody.Server
{
	public class VoiceManager
	{

		private readonly ILogger _logger = Logger.CreateLogger("VoiceManager");
		private readonly DiscordClient _client;
		private VoiceNextConnection? _vnc;

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
			catch (System.Exception)
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

			catch (System.Exception e)
			{
				_logger.Error(e, "An unknown error occurred while trying to join the voice channel {VoiceChannelName}", voiceChannel.Name);
				return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.UnknownError };
			}
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
