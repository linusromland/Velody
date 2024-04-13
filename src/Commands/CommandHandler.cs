using DSharpPlus;
using DSharpPlus.SlashCommands;
using Serilog;
using System.Reflection;

namespace Velody
{
    internal class CommandHandler
    {
        private readonly SlashCommandsExtension _slashCommands;
        private readonly ILogger _logger = Logger.CreateLogger("CommandHandler");

        private readonly List<ApplicationCommandModule> _commandModules;

        public CommandHandler(SlashCommandsExtension slashCommands, List<ApplicationCommandModule> commandModules)
        {
            _slashCommands = slashCommands;
            _commandModules = commandModules;

            _slashCommands.SlashCommandErrored += async (sender, e) =>
            {
                _logger.Error(e.Exception, "An error occurred while executing a command.");
                await Task.CompletedTask;
            };

            _slashCommands.SlashCommandExecuted += async (sender, e) =>
            {
                _logger.Information("Command executed: {CommandName}", e.Context.CommandName);
                await Task.CompletedTask;
            };
        }

        public void RegisterCommands()
        {
            foreach (ApplicationCommandModule commandModule in _commandModules)
            {
                _logger.Information("Registering command module {CommandModule}", commandModule.GetType().Name);
                _slashCommands.RegisterCommands(commandModule.GetType().GetTypeInfo(), Settings.DiscordGuildId);
            }
        }

    }
}
