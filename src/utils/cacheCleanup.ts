// External dependencies
import fs from 'fs';

// Internal dependencies
import Database from '../classes/Database';
import { getCacheDirName, getCacheFileName } from './getCacheFileName';
import { container } from '@sapphire/framework';

const cacheCleanup = async (database: Database) => {
	let CACHE_MAX_SIZE_IN_MB = parseInt(process.env.CACHE_MAX_SIZE_IN_MB || '1000', 10);

	if (CACHE_MAX_SIZE_IN_MB < 500) {
		container.logger.warn('CACHE_MAX_SIZE_IN_MB is too low, setting it to 500 MB');
		CACHE_MAX_SIZE_IN_MB = 500;
	}

	const MAX_SIZE_MB = CACHE_MAX_SIZE_IN_MB - 100;

	const { cacheSizeMb, cachedIds } = getDirInfo();

	if (cacheSizeMb < MAX_SIZE_MB) return;

	// Get videos from database
	const videos = await database.getVideos(cachedIds);

	if (!videos) return;

	for (const video of videos) {
		container.logger.info(`Removing ${video.title} from cache`);
		const videoCacheName = getCacheFileName(video._id);
		fs.unlinkSync(videoCacheName);

		// Check folder size
		const { cacheSizeMb } = getDirInfo(false);
		if (cacheSizeMb < MAX_SIZE_MB) break;
	}
};

const getDirInfo = (getIds = true) => {
	const cacheDir = getCacheDirName();
	const cacheFiles = fs.readdirSync(cacheDir);
	const cacheSize = cacheFiles.reduce((acc, cur) => {
		const { size } = fs.statSync(`${cacheDir}/${cur}`);
		return acc + size;
	}, 0);

	const cacheSizeMb = cacheSize / 1024 / 1024;

	const cachedIds = getIds ? cacheFiles.map((file) => file.split('.')[0]) : undefined;

	return {
		cacheSizeMb,
		...(getIds ? { cachedIds } : {})
	};
};

export default cacheCleanup;
