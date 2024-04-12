using Serilog;

namespace Velody
{
    internal class Program
    {  
        private static readonly ILogger _logger = Logger.CreateLogger();

        static async Task Main(string[] args)
        {
            _logger.Information("Starting Velody...");
            _ = new Bot();

            await Task.Delay(-1);
        }
    }
}