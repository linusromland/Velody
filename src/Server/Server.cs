
using DSharpPlus;
using Google.Apis.YouTube.v3.Data;
using Serilog;

namespace Velody
{
	public class Server
	{
		private readonly ILogger _logger;
		private readonly ulong _guildId;
		private readonly string _name;
		private readonly DiscordClient _client;
		public VoiceManager VoiceManager { get; }
		public Queue Queue { get; }

		public Server(DiscordClient client, string name, ulong guildId, VideoHandler videoHandler, HistoryRepository historyRepository, VideoRepository videoRepository)
		{
			_client = client;
			_name = name;
			_guildId = guildId;

			_logger = Logger.CreateLogger($"Server-{_name}(ID: {_guildId})");

			VoiceManager = new VoiceManager(_client);
			Queue = new Queue(_name, videoHandler, historyRepository, videoRepository);
			Queue.PlaySong += async (videoPath) =>
			{
				await VoiceManager.PlayAudioAsync(videoPath);
				Queue.HandlePlaybackFinished();
				if (Queue.IsQueueEmpty())
				{
					_logger.Information("Queue is empty, stopping playback");
					VoiceManager.LeaveVoiceChannel();
					// TODO: Dispose the Server object
				}
				else
				{
					_logger.Information("Playing next song in queue");
					_ = Queue.PlayNextSongAsync();
				}
			};

			_logger.Information($"Server {_name} initialized with ID {_guildId}");
		}
	}
}
