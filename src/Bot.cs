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

        public Bot()
        {
            _client = new DiscordClient(new DiscordConfiguration
            {
                Token = Settings.DiscordBotToken,
                TokenType = TokenType.Bot,
                Intents = DiscordIntents.AllUnprivileged,
                LoggerFactory = Logger.CreateLoggerFactory()
            });

            _client.Ready += (_, _) =>
           {
               _logger.Information("Bot is ready");
               return Task.CompletedTask;
            };

            _commands = _client.UseCommandsNext(new CommandsNextConfiguration
            {
                StringPrefixes = ["!"]
            });

            _client.ConnectAsync();
        }

    }
}
