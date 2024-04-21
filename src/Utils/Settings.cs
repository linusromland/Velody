using System.Configuration;

namespace Velody.Utils
{
    internal class Settings
    {
        // Discord Configuration
        public static readonly string? DiscordBotToken = ConfigurationManager.AppSettings["DiscordBotToken"];
        public static readonly ulong? DiscordGuildId = ulong.TryParse(ConfigurationManager.AppSettings["DiscordGuildId"], out var guildId) ? guildId : null;

        // Youtube Configuration
        public static readonly string? YoutubeApiKey = ConfigurationManager.AppSettings["YoutubeApiKey"];

        // MongoDB Configuration
        public static readonly string MongoDBConnectionString = ConfigurationManager.AppSettings["MongoDBConnectionString"] ?? "mongodb://localhost:27017";
        public static readonly string MongoDBDatabaseName = ConfigurationManager.AppSettings["MongoDBDatabaseName"] ?? "velody";
    }
}
