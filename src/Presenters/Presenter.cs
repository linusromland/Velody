using DSharpPlus;
using MongoDB.Bson;
using Serilog;
using Velody.MongoDBIntegration.Models;
using Velody.MongoDBIntegration.Repositories;
using Velody.Presenters.TextGeneration;
using Velody.Presenters.TTS;
using Velody.Utils;
using Velody.Video;

namespace Velody.Presenters
{
    public class Presenter
    {
        private readonly ITTSProvider _ttsProvider;
        private readonly ITextGenerator _textGenerator;
        private readonly ILogger _logger = Logger.CreateLogger("Presenter");
        private readonly HistoryRepository _historyRepository;
        private readonly AnnounceMessageRepository _announceMessageRepository;

        public Presenter(DiscordClient client, HistoryRepository historyRepository, AnnounceMessageRepository announceMessageRepository)
        {
            // TODO: Add config here
            _ttsProvider = new GoogleTTS();
            _textGenerator = new SimpleTextGenerator(client);

            _historyRepository = historyRepository;
            _announceMessageRepository = announceMessageRepository;
        }

        public async Task<string> DownloadNextAnnouncementAsync(VideoInfo nextSong, string sessionId, string historyId)
        {
            PopulatedHistoryModel? previousVideo = await _historyRepository.GetHistory(sessionId);

            string text = _textGenerator.GenerateTextForNextVideo(nextSong);

            _logger.Information("Generating TTS for announcement: {Text}", text);

            ObjectId announceMessageId = await _announceMessageRepository.InsertAnnounceMessage(DateTime.UtcNow, nextSong.GuildId, nextSong.ChannelId, sessionId, text, _textGenerator.ServiceName);
            await _historyRepository.AmendAnnounceMessageId(historyId, announceMessageId);

            string directory = GetDirectory.GetCachePath($"tts/{_ttsProvider.ServiceName}");
            string filePath = $"{directory}/{announceMessageId}.mp3";

            Console.WriteLine(filePath);

            await _ttsProvider.DownloadTTSAsync(text, filePath);

            return filePath;
        }
    }
}