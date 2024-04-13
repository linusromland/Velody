using DSharpPlus;
using DSharpPlus.SlashCommands;
using DSharpPlus.VoiceNext;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

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
                .AddSingleton<JoinCommand>()
                .AddSingleton<PlayCommand>()
                .AddSingleton(provider =>
                {
                    return new List<ApplicationCommandModule>
                    {
                        provider.GetRequiredService<JoinCommand>(),
                        provider.GetRequiredService<PlayCommand>()
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
                .AddSingleton<Counter>()
                .AddSingleton<CommandHandler>()
                .AddSingleton<ServerManager>()
                .AddSingleton<Bot>()
                .BuildServiceProvider();


            return services;
        }
    }
}
