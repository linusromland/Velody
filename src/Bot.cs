using DSharpPlus;
using DSharpPlus.SlashCommands;
using Serilog;
using Velody.Commands;

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
            new CommandHandler(_slashCommands).RegisterCommands();

            _client.ConnectAsync();
        }


    }
}
