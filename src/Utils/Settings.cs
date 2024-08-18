using System;
using DotNetEnv;

namespace Velody.Utils
{
    internal class Settings
    {
        // Discord Configuration
        public static readonly string? DiscordBotToken = Environment.GetEnvironmentVariable("DiscordBotToken");
        public static readonly ulong? DiscordGuildId = ulong.TryParse(Environment.GetEnvironmentVariable("DiscordGuildId"), out var guildId) ? guildId : null;

        // Google Configuration
        public static readonly string? GoogleApiKey = Environment.GetEnvironmentVariable("GoogleApiKey");

        // MongoDB Configuration
        public static readonly string MongoDBConnectionString = Environment.GetEnvironmentVariable("MongoDBConnectionString") ?? "mongodb://localhost:27017";
        public static readonly string MongoDBDatabaseName = Environment.GetEnvironmentVariable("MongoDBDatabaseName") ?? "velody";

        // OpenAI Configuration
        public static readonly string? OpenAIApiKey = Environment.GetEnvironmentVariable("OpenAIApiKey");

        // General Configuration
        public static readonly bool PresenterEnabled = bool.TryParse(Environment.GetEnvironmentVariable("PresenterEnabled"), out var presenterEnabled) ? presenterEnabled : true;
        public static readonly string TTSProvider = Environment.GetEnvironmentVariable("TTSProvider") ?? "GoogleTTS";
        public static readonly string TextGenerator = Environment.GetEnvironmentVariable("TextGenerator") ?? "SimpleTextGenerator";

    }
}
