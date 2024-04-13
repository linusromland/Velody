using DSharpPlus;
using DSharpPlus.SlashCommands;
using Serilog;

namespace Velody
{
	public class Counter
	{

		private readonly ILogger _logger = Logger.CreateLogger("Counter");
		private int _count = 0;

		public void Increment()
		{
			_count++;
			_logger.Information("Counter incremented to {_count}", _count);
		}

		public void Decrement()
		{
			_count--;
			_logger.Information("Counter decremented to {_count}", _count);
		}

		public void Reset()
		{
			_count = 0;
			_logger.Information("Counter reset to {_count}", _count);
		}

		public int GetCount()
		{
			return _count;
		}
	}
}

