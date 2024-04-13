using System.Configuration;

namespace Velody
{
    internal class Settings
    {
        public static readonly string? DiscordBotToken = ConfigurationManager.AppSettings["DiscordBotToken"];

        public static readonly ulong? DiscordGuildId = ulong.TryParse(ConfigurationManager.AppSettings["DiscordGuildId"], out var guildId) ? guildId : null;

        public static readonly string? YoutubeApiKey = ConfigurationManager.AppSettings["YoutubeApiKey"];
    }
}
