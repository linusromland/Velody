using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using DSharpPlus.VoiceNext;
using System;
using System.Threading.Tasks;

namespace Velody
{
	public class VoiceManager
	{
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


		public async Task JoinVoiceChannelAsync(DiscordChannel voiceChannel)
		{
			if (voiceChannel.Type != ChannelType.Voice)
			{
				throw new ArgumentException("Specified channel is not a voice channel.");
			}

			var vnext = _client.GetVoiceNext();
			_vnc = vnext.GetConnection(voiceChannel.Guild);

			if (_vnc != null)
			{
				throw new InvalidOperationException("Already connected to a voice channel in this guild.");
			}

			_vnc = await vnext.ConnectAsync(voiceChannel);
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
