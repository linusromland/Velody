using DSharpPlus;
using DSharpPlus.SlashCommands;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Velody.Commands;
using Velody.Commands.CommandModules;

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
            // Discord-related services
            ServiceProvider discordServices = new ServiceCollection()
                .AddSingleton(provider =>
                {
                    return new DiscordClient(new DiscordConfiguration
                    {
                        Token = Settings.DiscordBotToken,
                        TokenType = TokenType.Bot,
                        Intents = DiscordIntents.AllUnprivileged | DiscordIntents.MessageContents,
                        LoggerFactory = Logger.CreateLoggerFactory()
                    });
                })
                .AddSingleton<PingCommand>()
                .AddSingleton(provider =>
                {
                    return new List<ApplicationCommandModule>
                    {
                provider.GetRequiredService<PingCommand>()
                    };
                })
                .AddSingleton(provider =>
                {
                    DiscordClient client = provider.GetRequiredService<DiscordClient>();
                    SlashCommandsExtension slashCommands = client.UseSlashCommands(new SlashCommandsConfiguration
                    {
                        Services = provider,
                    });
                    return slashCommands;
                })
                .BuildServiceProvider();

            // Application-specific services
            ServiceProvider appServices = new ServiceCollection()
                .AddSingleton<Counter>()
                .AddSingleton<CommandHandler>()
                .AddSingleton<Bot>()
                .BuildServiceProvider();

            // Merge Discord-related and application-specific services
            ServiceProvider services = new ServiceCollection()
                .AddSingleton(discordServices)
                .AddSingleton(appServices)
                .BuildServiceProvider();

            return services;
        }
    }
}
