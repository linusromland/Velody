// External dependencies
import { connect } from 'mongoose';
import { container } from '@sapphire/framework';

// Internal dependencies
import HistoryModel from '../models/History';
import VideoModel from '../models/Video';
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
}
