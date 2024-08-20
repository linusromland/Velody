using DSharpPlus;
using DSharpPlus.SlashCommands;
using DSharpPlus.VoiceNext;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Velody.InteractionHandlers;
using Velody.MongoDBIntegration;
using Velody.MongoDBIntegration.Repositories;
using Velody.Presenters;
using Velody.Presenters.TextGeneration;
using Velody.Presenters.TTS;
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
            // Init dotenv
            DotNetEnv.Env.Load();

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
                        Task.Run(() => InteractionHandler.HandleInteraction(provider.GetRequiredService<ServerManager>(), provider.GetRequiredService<HistoryRepository>(), client, e));
                        return Task.CompletedTask;
                    };

                    client.VoiceStateUpdated += (client, e) =>
                    {
                        if (e.User.IsBot && e.User.Id == client.CurrentUser.Id)
                        {
                            if (e.After.Channel == null)
                            {
                                ServerManager serverManager = provider.GetRequiredService<ServerManager>();
                                Server.Server? server = serverManager.GetServer(e.Guild.Id, false);

                                if (server != null)
                                {
                                    server.DisposeServer();
                                }
                            }
                        }

                        return Task.CompletedTask;
                    };

                    // Enable voice
                    client.UseVoiceNext();

                    return client;
                })
                .AddSingleton<PlayCommand>()
                .AddSingleton<PlaySkipCommand>()
                .AddSingleton<PlayTopCommand>()
                .AddSingleton<NowPlayingCommand>()
                .AddSingleton<ClearQueueCommand>()
                .AddSingleton<SkipCommand>()
                .AddSingleton<QueueCommand>()
                .AddSingleton<ClearQueueCommand>()
                .AddSingleton<ShuffleQueueCommand>()
                .AddSingleton<LastAnnouncementMessageCommand>()
                .AddSingleton<LoopCommand>()
                .AddSingleton<LoopQueueCommand>()
                .AddSingleton<RemoveCommand>()
                .AddSingleton<PresenterCommand>()
                .AddSingleton<HistoryCommand>()
                .AddSingleton<LeaveCommand>()

                .AddSingleton(provider =>
                {
                    return new List<ApplicationCommandModule>
                    {
                        provider.GetRequiredService<PlayCommand>(),
                        provider.GetRequiredService<PlaySkipCommand>(),
                        provider.GetRequiredService<PlayTopCommand>(),
                        provider.GetRequiredService<NowPlayingCommand>(),
                        provider.GetRequiredService<SkipCommand>(),
                        provider.GetRequiredService<QueueCommand>(),
                        provider.GetRequiredService<ClearQueueCommand>(),
                        provider.GetRequiredService<ShuffleQueueCommand>(),
                        provider.GetRequiredService<LastAnnouncementMessageCommand>(),
                        provider.GetRequiredService<LoopCommand>(),
                        provider.GetRequiredService<LoopQueueCommand>(),
                        provider.GetRequiredService<RemoveCommand>(),
                        provider.GetRequiredService<PresenterCommand>(),
                        provider.GetRequiredService<HistoryCommand>(),
                        provider.GetRequiredService<LeaveCommand>()
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

                // Presenter
                .AddSingleton<Presenter>()

                // Database connection and repositories
                .AddSingleton(provider => new MongoDBHelper(Settings.MongoDBConnectionString, Settings.MongoDBDatabaseName))
                .AddSingleton<VideoRepository>()
                .AddSingleton<HistoryRepository>()
                .AddSingleton<CacheRepository>()
                .AddSingleton<AnnounceMessageRepository>()
                .AddSingleton<ServerRepository>()


                .BuildServiceProvider();


            return services;
        }
    }
}
