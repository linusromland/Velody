// External dependencies
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import { google } from 'googleapis';

// Internal dependencies
import Video from '../interfaces/Video';

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
	const realApiResult: IResponseData = await youtubeApiSearch(query);

	const video: IVideoDetails = (await youtubeApiVideo(realApiResult.items[0].id.videoId)) as unknown as IVideoDetails;

	return {
		title: realApiResult.items[0].snippet.title,
		url: `https://www.youtube.com/watch?v=${realApiResult.items[0].id.videoId}`,
		thumbnail: realApiResult.items[0].snippet.thumbnails.default.url,
		length: convertDurationToSeconds(video.items[0].contentDetails.duration)
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
			length: 0
		}));
	} catch (e) {
		return;
	}
};

interface IThumbnail {
	url: string;
}

interface IThumbnails {
	default: IThumbnail;
}

interface ISnippet {
	title: string;
	thumbnails: IThumbnails;
}

interface IId {
	videoId: string;
}

interface IItem {
	id: IId;
	snippet: ISnippet;
}

interface IResponseData {
	items: IItem[];
}

interface IVideoDetails {
	kind: string;
	etag: string;
	items: YouTubeVideo[];
	pageInfo: object;
}

interface YouTubeVideo {
	kind: string;
	etag: string;
	id: string;
	contentDetails: IContentDetails;
}

interface IContentDetails {
	duration: string;
	dimension: string;
	definition: string;
	caption: string;
	licensedContent: boolean;
	contentRating: object;
	projection: string;
}

const youtubeApiSearch = async (query: string): Promise<IResponseData> => {
	return new Promise((resolve, reject) => {
		const res = youtube.search.list({
			// @ts-ignore
			part: 'snippet',
			q: query,
			maxResults: 1,
			type: 'video'
		});

		res
			.then((response) => {
				if (!response) return;
				if (!response.data) return;
				resolve(response.data as unknown as IResponseData);
			})
			.catch((err: object) => {
				reject(err);
			});
	});
};

const youtubeApiVideo = async (videoId: string): Promise<IResponseData> => {
	return new Promise((resolve, reject) => {
		const res = youtube.videos.list({
			// @ts-ignore
			part: 'contentDetails',
			id: videoId
		});

		res
			.then((response) => {
				if (!response) return;
				if (!response.data) return;
				resolve(response.data as unknown as IResponseData);
			})
			.catch((err: object) => {
				reject(err);
			});
	});
};

function convertDurationToSeconds(duration: string): number {
	// Regular expression to match the ISO 8601 duration format
	const durationRegex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

	const matches = duration.match(durationRegex);
	if (!matches) {
		throw new Error('Invalid ISO 8601 duration format');
	}

	// Extract hours, minutes, and seconds from the duration string
	const hours = parseInt(matches[1]) || 0;
	const minutes = parseInt(matches[2]) || 0;
	const seconds = parseInt(matches[3]) || 0;

	// Convert the duration to seconds
	return hours * 3600 + minutes * 60 + seconds;
}

export default youtubeSearch;
