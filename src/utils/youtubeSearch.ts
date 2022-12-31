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
	console.log(info.videoDetails.thumbnails);
	return {
		title: info.videoDetails.title,
		url: info.videoDetails.video_url,
		thumbnail:
			info.videoDetails.thumbnails?.sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url ||
			null,
		length: info.videoDetails.lengthSeconds
	};
};

const getFromQuery = async (query: string): Promise<Video> => {
	const searchResults: ytsr.Result = await ytsr(
		`https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`,
		{ limit: 1 }
	);
	const result: ytsr.Video = searchResults.items[0] as ytsr.Video;
	console.log(result.thumbnails);
	return {
		title: result.title,
		url: result.url,
		//get highest quality thumbnail
		thumbnail:
			result.thumbnails?.sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url || null,
		length: result.duration
	};
};

export default youtubeSearch;
