﻿using System;
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
    }
}
