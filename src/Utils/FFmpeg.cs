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
			Process ffmpeg = new Process
			{
				StartInfo = new ProcessStartInfo
				{
					FileName = "ffmpeg",
					Arguments = $@"-i ""{path}"" -ac 2 -f s16le -ar 48000 pipe:1",
					RedirectStandardOutput = true,
					RedirectStandardError = true,
					UseShellExecute = false
				}
			};

			ffmpeg.Start();

			Task.Run(() =>
			{
				// Capture any error output for debugging
				var error = ffmpeg.StandardError.ReadToEnd();
				if (!string.IsNullOrEmpty(error))
				{
					_logger.Error("FFmpeg error: {Error}", error);
				}
			});

			ffmpeg.EnableRaisingEvents = true;
			ffmpeg.Exited += (sender, args) =>
			{
				if (ffmpeg.ExitCode != 0)
				{
					_logger.Error("FFmpeg process exited with code {ExitCode}", ffmpeg.ExitCode);
				}
				else
				{
					_logger.Information("FFmpeg process completed successfully.");
				}
				ffmpeg.Dispose();
			};

			return ffmpeg.StandardOutput.BaseStream;
		}
	}
}

