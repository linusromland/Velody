using DSharpPlus;
using DSharpPlus.SlashCommands;
using Serilog;

namespace Velody
{
    internal class Bot
    {
        private readonly DiscordClient _client;
        private readonly ILogger _logger = Logger.CreateLogger("Bot");

        public Bot(DiscordClient client, CommandHandler commandHandler)
        {
            _client = client;
            commandHandler.RegisterCommands();
        }

        public async Task StartAsync()
        {
            _client.Ready += (sender, _) =>
            {
                _logger.Information("Connected to Discord as {BotName}", sender.CurrentUser.Username);
                return Task.CompletedTask;
            };

            await _client.ConnectAsync();
        }
    }
}

