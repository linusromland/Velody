
using DSharpPlus;
using DSharpPlus.Entities;
using Serilog;
using Velody.MongoDBIntegration.Repositories;
using Velody.Presenters;
using Velody.Utils;
using Velody.Video;

namespace Velody.Server
{
    public class ServerManager(DiscordClient client, VideoHandler videoHandler, HistoryRepository historyRepository, VideoRepository videoRepository, ServerRepository serverRepository, Presenter presenter)
    {
        private readonly ILogger _logger = Logger.CreateLogger("ServerManager");
        private readonly DiscordClient _client = client;
        private readonly VideoHandler _videoHandler = videoHandler;
        private readonly HistoryRepository _historyRepository = historyRepository;
        private readonly VideoRepository _videoRepository = videoRepository;
        private readonly ServerRepository _serverRepository = serverRepository;
        private readonly Presenter _presenter = presenter;
        private Dictionary<ulong, Server> _servers = new Dictionary<ulong, Server>();

        public Server? GetServer(ulong guildId, bool createIfNotExists = true)
        {
            if (_servers.ContainsKey(guildId))
            {
                return _servers[guildId];
            }
            else
            {
                if (!createIfNotExists)
                {
                    return null;
                }

                DiscordGuild? guild = _client.GetGuildAsync(guildId).Result;

                if (guild != null)
                {
                    Server server = new Server(_client, guild.Name, guildId, _videoHandler, _historyRepository, _videoRepository, _serverRepository, _presenter);
                    server.Dispose += (id) =>
                    {
                        _servers.Remove(id);
                        _logger.Information("Server with ID {GuildId} disposed", id);
                        return Task.CompletedTask;
                    };
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
