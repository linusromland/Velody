
using DSharpPlus;
using DSharpPlus.Entities;
using Serilog;

namespace Velody
{
	public class ServerManager(DiscordClient client, VideoHandler videoHandler, HistoryRepository historyRepository, VideoRepository videoRepository)
	{
		private readonly ILogger _logger = Logger.CreateLogger("ServerManager");

		private readonly DiscordClient _client = client;

		private readonly VideoHandler _videoHandler = videoHandler;

		private readonly HistoryRepository _historyRepository = historyRepository;

		private readonly VideoRepository _videoRepository = videoRepository;

		private Dictionary<ulong, Server> _servers = new Dictionary<ulong, Server>();

		public Server? GetServer(ulong guildId)
		{
			if (_servers.ContainsKey(guildId))
			{
				return _servers[guildId];
			}
			else
			{
				DiscordGuild? guild = _client.GetGuildAsync(guildId).Result;

				if (guild != null)
				{
					Server server = new Server(_client, guild.Name, guildId, _videoHandler, _historyRepository, _videoRepository);
					_servers.Add(guildId, server);
					return server;
				}
				else
				{
					_logger.Warning("Guild with ID {GuildId} not found", guildId);
					return null;
				}
			}
		}
	}
}
