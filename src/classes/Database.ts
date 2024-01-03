// External dependencies
import { connect } from 'mongoose';
import { container } from '@sapphire/framework';
import fs from 'fs';

// Internal dependencies
import HistoryModel from '../models/History';
import VideoModel from '../models/Video';
import TTSCacheModel from '../models/TTSCache';
import Video from '../interfaces/Video';

export default class Database {
	private isActivated: boolean;

	public constructor() {
		const MONGODB_URI = process.env.MONGODB_URI;

		if (!MONGODB_URI) {
			container.logger.error('No MongoDB URI provided');
			this.isActivated = false;
			return;
		}

		this.isActivated = true;
		connect(MONGODB_URI);
	}

	public async addHistory(video: Video): Promise<void> {
		if (!this.isActivated) return;

		// Find the video in the database
		const videoFromDB = await VideoModel.findOne({ _id: video.videoId });

		// If the video is not in the database, add it
		if (!videoFromDB) {
			const newVideo = new VideoModel({
				_id: video.videoId,
				title: video.title,
				url: video.url,
				length: video.length,
				thumbnail: video.thumbnail
			});

			await newVideo.save();
		} else {
			videoFromDB.lastPlayed = new Date();
			await videoFromDB.save();
		}

		const newHistory = new HistoryModel({
			guildId: video.serverId,
			userId: video.userId,
			video: video.videoId
		});
		await newHistory.save();
	}

	public async getVideos(videoIds?: string[]) {
		if (!this.isActivated) return;

		if (!videoIds) return await VideoModel.find();

		return await VideoModel.find({ _id: { $in: videoIds } }).sort({ lastPlayed: 1 });
	}

	public async createTTSCache(buffer: Buffer, text: string, permanent = false, videoId?: string) {
		if (!this.isActivated) return;

		if (await TTSCacheModel.exists({ _id: text })) return;

		if (!(await VideoModel.exists({ _id: videoId })) && videoId) return;

		const newTTSCache = new TTSCacheModel({
			_id: text,
			buffer,
			permanent,
			video: videoId
		});

		await newTTSCache.save();

		this.cleanTTSCache();

		return newTTSCache;
	}

	public async getCachedTTS(text: string) {
		const ttsCache = await TTSCacheModel.findOne({ _id: text });

		if (ttsCache) {
			ttsCache.lastPlayed = new Date();
			await ttsCache.save();
		}

		return ttsCache;
	}

	private async cleanTTSCache() {
		const count = await TTSCacheModel.countDocuments({ permanent: false });
		if (count < 25) return;

		await TTSCacheModel.findOneAndDelete({ permanent: false }, { sort: { lastPlayed: 1 } });
	}

}
