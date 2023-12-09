// External dependencies
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import { google } from 'googleapis';

// Internal dependencies
import Video from '../interfaces/Video';
import convertDurationToSeconds from './durationToSeconds';

// Create a client instance
const youtube = google.youtube({
	version: 'v3',
	auth: process.env.YOUTUBE_API_KEY
});

const youtubeSearch = async (query: string, allowPlaylist: boolean = true): Promise<Video[] | void> => {
	const isUrl: boolean = validUrl(query);

	if (!isUrl && !query) return;

	//Check if url is valid & has query parameter "list"
	if (isUrl) {
		const url: URL = new URL(query);
		const playListId: string | null = url.searchParams.get('list');

		if (playListId && allowPlaylist) {
			return await getPlaylist(playListId);
		} else if (playListId && !allowPlaylist) {
			return;
		}
	}

	const video: Video | void = isUrl ? await getFromUrl(query) : await getFromQuery(query);

	if (!video) return;

	return [video];
};

const validUrl = (url: string): boolean => {
	return new RegExp(/[(http(s)?)://(www.)?a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/gi).test(
		url
	);
};

const getFromUrl = async (url: string): Promise<Video | void> => {
	try {
		const info: ytdl.videoInfo = await ytdl.getInfo(url);

		if (!info.videoDetails) return;

		return {
			title: info.videoDetails.title,
			url: info.videoDetails.video_url,
			thumbnail:
				info.videoDetails.thumbnails?.sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url ||
				null,
			length: Number(info.videoDetails.lengthSeconds)
		};
	} catch (e) {
		return;
	}
};

const getFromQuery = async (query: string): Promise<Video | void> => {
	const result = await youtubeApiSearch(query);

	if (!result) return;

	const resultItem = result.items?.[0];

	if (!resultItem) return;

	const videoId = resultItem.id?.videoId;

	if (!videoId) return;

	const video = await youtubeApiVideo(videoId);

	return {
		title: resultItem.snippet?.title ?? '',
		url: `https://www.youtube.com/watch?v=${videoId}`,
		thumbnail: resultItem.snippet?.thumbnails?.default?.url ?? '',
		length: convertDurationToSeconds(video?.items?.[0].contentDetails?.duration ?? '0')
	};
};

const getPlaylist = async (id: string) => {
	try {
		const playlist: ytpl.Result = await ytpl(id);
		return playlist.items.map((item: ytpl.Item) => ({
			title: item.title,
			url: item.shortUrl,
			thumbnail:
				item.thumbnails?.sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url || null,
			length: Number(item.durationSec)
		}));
	} catch (e) {
		return;
	}
};

const youtubeApiSearch = async (query: string) => {
	const response = await youtube.search.list({
		part: ['snippet'],
		q: query,
		maxResults: 1,
		type: ['video']
	});

	if (!response) return;
	const { data } = response;

	if (!data) return;

	return data;
};

const youtubeApiVideo = async (videoId: string) => {
	const response = await youtube.videos.list({
		part: ['contentDetails'],
		id: [videoId]
	});

	if (!response) return;
	const { data } = response;

	if (!data) return;

	return data;
};

export default youtubeSearch;
