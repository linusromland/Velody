using System.Configuration;

namespace Velody
{
    internal class Settings
    {
        public static readonly string? DiscordBotToken = ConfigurationManager.AppSettings["DiscordBotToken"];
    }
}
