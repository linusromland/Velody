using DSharpPlus;
using DSharpPlus.SlashCommands;
using DSharpPlus.VoiceNext;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Velody.MongoDBIntegration;
using Velody.MongoDBIntegration.Repositories;
using Velody.Server;
using Velody.Utils;
using Velody.Video;

namespace Velody
{
    internal class Program
    {
        private static readonly ILogger _logger = Logger.CreateLogger("Main");

        static async Task Main(string[] args)
        {
            _logger.Information("Starting Velody...");

            ServiceProvider serviceProvider = ConfigureServices();
            Bot bot = serviceProvider.GetRequiredService<Bot>();
            await bot.StartAsync();



            await Task.Delay(-1);
        }

        private static ServiceProvider ConfigureServices()
        {
            ServiceProvider services = new ServiceCollection()
                .AddSingleton(provider =>
                {
                    DiscordClient client = new DiscordClient(new DiscordConfiguration
                    {
                        Token = Settings.DiscordBotToken,
                        TokenType = TokenType.Bot,
                        Intents = DiscordIntents.AllUnprivileged | DiscordIntents.MessageContents,
                        LoggerFactory = Logger.CreateLoggerFactory()
                    });

                    // Enable voice
                    client.UseVoiceNext();

                    return client;
                })
                .AddSingleton<PlayCommand>()
                .AddSingleton<NowPlayingCommand>()
                .AddSingleton<SkipCommand>()
                .AddSingleton(provider =>
                {
                    return new List<ApplicationCommandModule>
                    {
                        provider.GetRequiredService<PlayCommand>(),
                        provider.GetRequiredService<NowPlayingCommand>(),
                        provider.GetRequiredService<SkipCommand>(),
                    };
                })
                .AddSingleton(provider =>
                {
                    DiscordClient client = provider.GetRequiredService<DiscordClient>();
                    SlashCommandsExtension slashCommands = client.UseSlashCommands(new SlashCommandsConfiguration
                    {
                        Services = provider
                    });
                    return slashCommands;
                })
                .AddSingleton<CommandHandler>()
                .AddSingleton<ServerManager>()
                .AddSingleton<Bot>()
                .AddSingleton<VideoHandler>()

                // Database connection and repositories
                .AddSingleton(provider => new MongoDBHelper(Settings.MongoDBConnectionString, Settings.MongoDBDatabaseName))
                .AddSingleton<VideoRepository>()
                .AddSingleton<HistoryRepository>()
                .AddSingleton<CacheRepository>()

                .BuildServiceProvider();


            return services;
        }
    }
}
