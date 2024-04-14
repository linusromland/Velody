
using DSharpPlus;
using Google.Apis.YouTube.v3.Data;
using Serilog;

namespace Velody
{
	public class Server
	{
		private readonly ILogger _logger;

		private readonly ulong _guildId;

		private readonly string _name;

		private readonly DiscordClient _client;

		public VoiceManager VoiceManager { get; }

		public Queue Queue { get; }

		public Server(DiscordClient client, string name, ulong guildId, VideoHandler videoHandler)
		{
			_client = client;
			_name = name;
			_guildId = guildId;

			_logger = Logger.CreateLogger($"Server-{_name}(ID: {_guildId})");

			VoiceManager = new VoiceManager(_client);
			Queue = new Queue(_name, videoHandler);
			Queue.PlaySong += async (videoPath) =>
			{
				await VoiceManager.PlayAudioAsync(videoPath);
			};

			_logger.Information($"Server {_name} initialized with ID {_guildId}");
		}
	}
}
