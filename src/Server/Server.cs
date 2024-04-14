
using DSharpPlus;
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

		public Server(DiscordClient client, string name, ulong guildId)
		{
			_client = client;
			_name = name;
			_guildId = guildId;

			_logger = Logger.CreateLogger($"Server-{_name}(ID: {_guildId})");

			VoiceManager = new VoiceManager(_client);
			_logger.Information($"Server {_name} initialized with ID {_guildId}");
		}
	}
}
