using System.Diagnostics;
using DSharpPlus;
using DSharpPlus.SlashCommands;
using Serilog;

namespace Velody.Utils
{
	internal class FFmpeg
	{
		private static readonly ILogger _logger = Logger.CreateLogger("FFmpeg");

		public static Stream GetFileStream(string path)
		{
			_logger.Information("Getting file stream for {Path}", path);
			Process? ffmpeg = Process.Start(new ProcessStartInfo
			{
				FileName = "ffmpeg",
				Arguments = $@"-i ""{path}"" -ac 2 -f s16le -ar 48000 pipe:1",
				RedirectStandardOutput = true,
				RedirectStandardError = true,
				UseShellExecute = false
			});

			if (ffmpeg == null)
			{
				_logger.Error("Failed to start FFmpeg process");
				throw new Exception("Failed to start FFmpeg process");
			}

			return ffmpeg.StandardOutput.BaseStream;
		}
	}
}

