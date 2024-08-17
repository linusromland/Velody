using System.Configuration;

namespace Velody.Utils
{
    internal class Settings
    {
        // Discord Configuration
        public static readonly string? DiscordBotToken = ConfigurationManager.AppSettings["DiscordBotToken"];
        public static readonly ulong? DiscordGuildId = ulong.TryParse(ConfigurationManager.AppSettings["DiscordGuildId"], out var guildId) ? guildId : null;

        // Google Configuration
        public static readonly string? GoogleApiKey = ConfigurationManager.AppSettings["GoogleApiKey"];

        // MongoDB Configuration
        public static readonly string MongoDBConnectionString = ConfigurationManager.AppSettings["MongoDBConnectionString"] ?? "mongodb://localhost:27017";
        public static readonly string MongoDBDatabaseName = ConfigurationManager.AppSettings["MongoDBDatabaseName"] ?? "velody";

        // OpenAI Configuration
        public static readonly string? OpenAIApiKey = ConfigurationManager.AppSettings["OpenAIApiKey"];
    }
}
