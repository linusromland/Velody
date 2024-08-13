using DSharpPlus;
using DSharpPlus.SlashCommands;
using DSharpPlus.VoiceNext;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Velody.InteractionHandlers;
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
            _logger.Information("Configuration complete");

            Bot bot = serviceProvider.GetRequiredService<Bot>();

            _logger.Information("Starting bot...");
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

                    // Enable interactions
                    client.ComponentInteractionCreated += (client, e) =>
                    {
                        Task.Run(() => InteractionHandler.HandleInteraction(provider.GetRequiredService<ServerManager>(), client, e));
                        return Task.CompletedTask;
                    };

                    // Enable voice
                    client.UseVoiceNext();

                    return client;
                })
                .AddSingleton<PlayCommand>()
                .AddSingleton<PlaySkipCommand>()
                .AddSingleton<NowPlayingCommand>()
                .AddSingleton<ClearQueueCommand>()
                .AddSingleton<SkipCommand>()
                .AddSingleton<QueueCommand>()
                .AddSingleton<ClearQueueCommand>()
                .AddSingleton<ShuffleQueueCommand>()
                .AddSingleton(provider =>
                {
                    return new List<ApplicationCommandModule>
                    {
                        provider.GetRequiredService<PlayCommand>(),
                        provider.GetRequiredService<PlaySkipCommand>(),
                        provider.GetRequiredService<NowPlayingCommand>(),
                        provider.GetRequiredService<SkipCommand>(),
                        provider.GetRequiredService<QueueCommand>(),
                        provider.GetRequiredService<ClearQueueCommand>(),
                        provider.GetRequiredService<ShuffleQueueCommand>()
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
