// External dependencies
import ytsr from 'ytsr';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import { google } from 'googleapis';

// Internal dependencies
import Video from '../interfaces/Video';

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
	const searchResults: ytsr.Result = await ytsr(
		`https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`,
		{ limit: 1 }
	);
	const result: ytsr.Video = searchResults.items[0] as ytsr.Video;

	if (!result) return;

	const realApiResult: IResponseData = await youtubeApiWrapper(query);

	console.log(realApiResult.items[0].snippet);

	let lengthInSeconds: number = 0;
	const time: string[] | undefined = result?.duration?.split(':');

	if (time && time.length === 3) {
		const hours: number = Number(time[0]);
		const minutes: number = Number(time[1]);
		const seconds: number = Number(time[2]);
		lengthInSeconds = hours * 3600 + minutes * 60 + seconds;
	} else if (time && time.length === 2) {
		const minutes: number = Number(time[0]);
		const seconds: number = Number(time[1]);
		lengthInSeconds = minutes * 60 + seconds;
	} else if (time && time.length === 1) {
		const seconds: number = Number(time[0]);
		lengthInSeconds = seconds;
	}

	if (!result.title || !result.url) return;

	return {
		title: result.title,
		url: result.url,
		//get highest quality thumbnail
		thumbnail:
			result.thumbnails?.sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url || null,
		length: lengthInSeconds
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

interface IResourceId {
	videoId: string;
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

const youtubeApiWrapper = async (query: string): Promise<IResponseData> => {
	return new Promise((resolve, reject) => {
		// Create a client instance
		const youtube = google.youtube({
			version: 'v3',
			auth: process.env.YOUTUBE_API_KEY
		});

		const res = youtube.search.list({
			// @ts-ignore
			part: 'id,snippet',
			q: query,
			maxResults: 1,
			type: 'video'
		});

		res
			.then((response) => {
				if (!response) return;
				if (!response.data) return;
				// @ts-ignore
				resolve(response.data as IResponseData);
			})
			.catch((err: object) => {
				reject(err);
			});
	});
};

export default youtubeSearch;
