using Microsoft.Extensions.Logging;
using Serilog;

namespace Velody
{
    internal class Logger
    {
        public static Serilog.ILogger CreateLogger()
        {
            return new LoggerConfiguration()
                .MinimumLevel.Information()
                .WriteTo.Console(outputTemplate: "{Timestamp:HH:mm:ss} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
                .WriteTo.File("logs/log.txt", rollingInterval: RollingInterval.Day, outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
                .CreateLogger();
        }

        public static ILoggerFactory CreateLoggerFactory()
        {
            var logger = CreateLogger();
            var factory = new LoggerFactory();
            factory.AddSerilog(logger);
            return factory;
        }
    }
}
