using DSharpPlus;
using DSharpPlus.CommandsNext;
using Serilog;
using System;
using System.Threading.Tasks;

namespace Velody
{
    internal class Bot
    {
        private DiscordClient _client;
        private CommandsNextExtension _commands;
        private static readonly ILogger _logger = Logger.CreateLogger();

        public async Task RunAsync()
        {
            _client = new DiscordClient(new DiscordConfiguration
            {
                Token = Settings.DiscordBotToken,
                TokenType = TokenType.Bot,
                Intents = DiscordIntents.AllUnprivileged
            });

            _client.Ready += (_, _) =>
            {
                _logger.Information("Bot is ready");
                return Task.CompletedTask;
            };

            _commands = _client.UseCommandsNext(new CommandsNextConfiguration
            {
                StringPrefixes = new[] { "!" }
            });

            await _client.ConnectAsync();
            await Task.Delay(-1);
        }   
    }
}
