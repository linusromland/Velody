using System.Reflection;
using DSharpPlus;
using DSharpPlus.CommandsNext;
using DSharpPlus.SlashCommands;
using Serilog;

namespace Velody
{
    internal class Bot
    {
        private DiscordClient _client;
        private static readonly ILogger _logger = Logger.CreateLogger();
        private readonly SlashCommandsExtension _slashCommands;

        public Bot()
        {
            _client = new DiscordClient(new DiscordConfiguration
            {
                Token = Settings.DiscordBotToken,
                TokenType = TokenType.Bot,
                Intents = DiscordIntents.AllUnprivileged | DiscordIntents.MessageContents,
                LoggerFactory = Logger.CreateLoggerFactory()
            });

            _client.Ready += (sender, _) =>
           {
               _logger.Information("Connected to Discord as {BotName}", sender.CurrentUser.Username);
               return Task.CompletedTask;
            };

            _slashCommands = _client.UseSlashCommands(new SlashCommandsConfiguration { });
            _slashCommands.RegisterCommands(Assembly.GetExecutingAssembly(), Settings.DiscordGuildId);

            _client.ConnectAsync();
        }


    }
}
