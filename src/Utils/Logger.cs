using Microsoft.Extensions.Logging;
using Serilog;

namespace Velody.Utils
{
    internal class Logger
    {
        public static Serilog.ILogger CreateLogger(string? id = null)
        {
            var loggerConfiguration = new LoggerConfiguration()
                .MinimumLevel.Information()
                .WriteTo.Console(outputTemplate: "{Timestamp:HH:mm:ss} [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
                .WriteTo.File("logs/log.txt", rollingInterval: RollingInterval.Day, outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}");

            if (!string.IsNullOrEmpty(id))
            {
                loggerConfiguration.Enrich.WithProperty("SourceContext", id);
            }

            return loggerConfiguration.CreateLogger();
        }

        public static ILoggerFactory CreateLoggerFactory(string? id = null)
        {
            var logger = CreateLogger(id);
            var factory = new LoggerFactory();
            factory.AddSerilog(logger);
            return factory;
        }
    }
}
