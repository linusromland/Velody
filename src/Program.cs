using Serilog;

namespace Velody
{
    internal class Program
    {  
        private static readonly ILogger _logger = Logger.CreateLogger();

        static void Main(string[] args)
        {
            _logger.Information("Starting Velody");

        }
    }
}