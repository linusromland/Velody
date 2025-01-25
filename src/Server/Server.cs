
using DSharpPlus;
using Google.Apis.YouTube.v3.Data;
using Serilog;
using Velody.MongoDBIntegration.Repositories;
using Velody.Presenters;
using Velody.Utils;
using Velody.Video;

namespace Velody.Server
{
    public class Server
    {
        private readonly ILogger _logger;
        private readonly string _sessionId;
        private readonly ulong _guildId;
        private readonly string _name;
        private readonly DiscordClient _client;
        private bool _leaveAnnounced;
        public VoiceManager VoiceManager { get; }
        public Queue Queue { get; }

        public event Func<ulong, Task>? Dispose;

        private HistoryRepository _historyRepository;

        public Server(DiscordClient client, string name, ulong guildId, VideoHandler videoHandler, HistoryRepository historyRepository, VideoRepository videoRepository, ServerRepository serverRepository, Presenter presenter)
        {
            _client = client;
            _name = name;
            _guildId = guildId;

            _sessionId = Guid.NewGuid().ToString();

            _logger = Logger.CreateLogger($"Server-{_name}(ID: {_guildId})");

            VoiceManager = new VoiceManager(_client);
            Queue = new Queue(_name, guildId.ToString(), videoHandler, historyRepository, videoRepository, serverRepository, presenter, _sessionId);
            Queue.PlayVideo += (videoPath, volume) =>
            {
                _logger.Information("Playing audio from path {VideoPath}", videoPath);
                VoiceManager.PlayAudio(videoPath, volume);
                return Task.CompletedTask;
            };

            VoiceManager.PlaybackFinished += (isSkip, forceLeave) =>
            {
                if (!forceLeave)
                {
                    Queue.HandlePlaybackFinished(isSkip);
                }
                if (Queue.IsQueueEmpty() || forceLeave)
                {
                    if (_leaveAnnounced || !Queue.IsAnnouncementEnabled || forceLeave)
                    {
                        _logger.Information("Queue is empty, stopping playback");
                        VoiceManager.LeaveVoiceChannel();
                        Dispose?.Invoke(_guildId);
                    }
                    else
                    {
                        _logger.Information("Queue is empty, announcing leave");
                        _leaveAnnounced = true;
                        _ = Queue.PlayLeaveAnnouncementAsync();
                    }
                }
                else
                {
                    // If leave was announced, reset it
                    if (_leaveAnnounced == true)
                    {
                        _leaveAnnounced = false;
                    }

                    _logger.Information("Playing next video in queue");
                    _ = Queue.PlayNextVideoAsync();
                }

                return Task.CompletedTask;
            };

            _logger.Information($"Server {_name} initialized with ID {_guildId}");

            _historyRepository = historyRepository;
        }

        public void DisposeServer()
        {
            VideoInfo? currentlyPlaying = Queue.CurrentlyPlaying;
            TimeSpan currentPlayTime = VoiceManager.GetPlaybackDuration();
            if (currentlyPlaying != null && currentlyPlaying.HistoryId != null)
            {
                _ = _historyRepository.SkippedHistory(currentlyPlaying.HistoryId, currentPlayTime);
            }

            Queue.ClearQueue();
            VoiceManager.StopAudio(true, true);
        }
    }
}
