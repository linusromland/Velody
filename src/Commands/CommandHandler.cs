using DSharpPlus;
using DSharpPlus.SlashCommands;
using Serilog;
using System.Reflection;

namespace Velody.Commands
{
    public class CommandHandler(SlashCommandsExtension slashCommands)
    {
        private readonly SlashCommandsExtension _slashCommands = slashCommands;
        private static readonly ILogger _logger = Logger.CreateLogger("CommandHandler");

        public void RegisterCommands()
        {
            _slashCommands.RegisterCommands(Assembly.GetExecutingAssembly());
            _logger.Information("Registered commands");
        }
    }
}
