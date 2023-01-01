// External dependencies
import ytsr from 'ytsr';
import ytdl from 'ytdl-core';

// Internal dependencies
import Video from '../interfaces/Video';

const youtubeSearch = async (query: string): Promise<Video> => {
	const isUrl: boolean = validUrl(query);

	return isUrl ? getFromUrl(query) : getFromQuery(query);
};

const validUrl = (url: string): boolean => {
	return new RegExp(/[(http(s)?)://(www.)?a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/gi).test(
		url
	);
};

const getFromUrl = async (url: string): Promise<Video> => {
	const info: ytdl.videoInfo = await ytdl.getInfo(url);
	return {
		title: info.videoDetails.title,
		url: info.videoDetails.video_url,
		thumbnail:
			info.videoDetails.thumbnails?.sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url ||
			null,
		length: Number(info.videoDetails.lengthSeconds)
	};
};

const getFromQuery = async (query: string): Promise<Video> => {
	const searchResults: ytsr.Result = await ytsr(
		`https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`,
		{ limit: 1 }
	);
	const result: ytsr.Video = searchResults.items[0] as ytsr.Video;

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

	return {
		title: result.title,
		url: result.url,
		//get highest quality thumbnail
		thumbnail:
			result.thumbnails?.sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url || null,
		length: lengthInSeconds
	};
};

export default youtubeSearch;
