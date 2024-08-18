using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;
using Velody.MongoDBIntegration.Models;

namespace Velody.MongoDBIntegration.Repositories
{
	public class HistoryRepository
	{
		private readonly IMongoCollection<HistoryModel> _historyCollection;
		private readonly VideoRepository _videoRepository;
		private readonly AnnounceMessageRepository _announceMessageRepository;

		public HistoryRepository(MongoDBHelper mongoDBHelper, VideoRepository videoRepository, AnnounceMessageRepository announceMessageRepository)
		{
			_historyCollection = mongoDBHelper.GetCollection<HistoryModel>("history");
			_videoRepository = videoRepository;
			_announceMessageRepository = announceMessageRepository;
		}

		public async Task<string> InsertHistory(ObjectId videoId, string userId, string guildId, string channelId, string sessionId, bool announced)
		{
			HistoryModel history = new HistoryModel
			{
				PlayedAt = DateTime.UtcNow,
				UserId = userId,
				GuildId = guildId,
				VideoId = videoId,
				ChannelId = channelId,
				SessionId = sessionId,
				Announced = announced
			};

			await _historyCollection.InsertOneAsync(history);
			return history.Id.ToString();
		}

		public async Task SkippedHistory(string historyId, TimeSpan skippedAt)
		{
			HistoryModel history = await _historyCollection.Find(h => h.Id == ObjectId.Parse(historyId)).FirstOrDefaultAsync();
			history.SkippedAt = (int)skippedAt.TotalSeconds;
			await _historyCollection.ReplaceOneAsync(h => h.Id == ObjectId.Parse(historyId), history);
		}

		public async Task<List<PopulatedHistoryModel>?> GetHistoryWithIgnore(string sessionId, string ignoreId)
		{
			FilterDefinition<HistoryModel> filter = Builders<HistoryModel>.Filter.Eq(h => h.SessionId, sessionId) & Builders<HistoryModel>.Filter.Ne(h => h.Id, ObjectId.Parse(ignoreId));
			List<HistoryModel>? historyItems = await _historyCollection.Find(filter).SortByDescending(h => h.PlayedAt).Limit(5).ToListAsync();
			if (historyItems == null)
			{
				return null;
			}

			List<PopulatedHistoryModel> populatedHistoryItems = [];

			foreach (HistoryModel history in historyItems)
			{
				VideoModel? video = await _videoRepository.GetVideo(history.VideoId);
				if (video == null)
				{
					continue;
				}

				AnnounceMessageModel? announceMessage = null;
				if (history.AnnounceMessageId != null)
				{
					announceMessage = await _announceMessageRepository.GetAnnounceMessage(history.AnnounceMessageId);
				}

				populatedHistoryItems.Add(new PopulatedHistoryModel
				{
					Id = history.Id,
					PlayedAt = history.PlayedAt,
					GuildId = history.GuildId,
					UserId = history.UserId,
					VideoId = history.VideoId,
					ChannelId = history.ChannelId,
					SessionId = history.SessionId,
					Announced = history.Announced,
					AnnounceMessageId = history.AnnounceMessageId,
					SkippedAt = history.SkippedAt,
					Video = video,
					AnnounceMessage = announceMessage
				});
			}

			return populatedHistoryItems;
		}

		public async Task<PopulatedHistoryModel?> GetHistory(string sessionId)
		{
			FilterDefinition<HistoryModel> filter = Builders<HistoryModel>.Filter.Eq(h => h.SessionId, sessionId);
			HistoryModel? historyItem = await _historyCollection.Find(filter).SortByDescending(h => h.PlayedAt).FirstOrDefaultAsync();
			if (historyItem == null)
			{
				return null;
			}


			VideoModel? video = await _videoRepository.GetVideo(historyItem.VideoId);
			if (video == null)
			{
				return null;
			}

			AnnounceMessageModel? announceMessage = null;
			if (historyItem.AnnounceMessageId != null)
			{
				announceMessage = await _announceMessageRepository.GetAnnounceMessage(historyItem.AnnounceMessageId);
			}

			return new PopulatedHistoryModel
			{
				Id = historyItem.Id,
				PlayedAt = historyItem.PlayedAt,
				GuildId = historyItem.GuildId,
				UserId = historyItem.UserId,
				VideoId = historyItem.VideoId,
				ChannelId = historyItem.ChannelId,
				SessionId = historyItem.SessionId,
				Announced = historyItem.Announced,
				AnnounceMessageId = historyItem.AnnounceMessageId,
				SkippedAt = historyItem.SkippedAt,
				Video = video,
				AnnounceMessage = announceMessage
			};
		}

		public async Task AmendAnnounceMessageId(string historyId, ObjectId announceMessageId)
		{
			HistoryModel history = await _historyCollection.Find(h => h.Id == ObjectId.Parse(historyId)).FirstOrDefaultAsync();
			history.AnnounceMessageId = announceMessageId;
			await _historyCollection.ReplaceOneAsync(h => h.Id == ObjectId.Parse(historyId), history);
		}

		public async Task<int> GetHistoryCount(string guildId)
		{
			FilterDefinition<HistoryModel> filter = Builders<HistoryModel>.Filter.Eq(h => h.GuildId, guildId);
			return (int)await _historyCollection.CountDocumentsAsync(filter);
		}

		public async Task<List<PopulatedHistoryModel>?> GetHistoryByServerId(string guildId, int pageSize, int offset)
		{
			FilterDefinition<HistoryModel> filter = Builders<HistoryModel>.Filter.Eq(h => h.GuildId, guildId);
			List<HistoryModel>? historyItems = await _historyCollection.Find(filter).SortByDescending(h => h.PlayedAt).Skip(offset).Limit(pageSize).ToListAsync();

			if (historyItems == null || historyItems.Count == 0)
			{
				return null;
			}

			List<PopulatedHistoryModel> populatedHistoryItems = [];

			for (int i = 0; i < historyItems.Count; i++)
			{
				HistoryModel history = historyItems[i];
				VideoModel? video = await _videoRepository.GetVideo(history.VideoId);
				if (video == null)
				{
					continue;
				}


				populatedHistoryItems.Add(new PopulatedHistoryModel
				{
					Id = history.Id,
					PlayedAt = history.PlayedAt,
					GuildId = history.GuildId,
					UserId = history.UserId,
					VideoId = history.VideoId,
					ChannelId = history.ChannelId,
					SessionId = history.SessionId,
					Announced = history.Announced,
					AnnounceMessageId = history.AnnounceMessageId,
					SkippedAt = history.SkippedAt,
					Video = video,
					AnnounceMessage = null
				});
			}

			return populatedHistoryItems;
		}

	}
}

