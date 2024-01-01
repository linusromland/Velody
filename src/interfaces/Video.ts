interface Video {
	videoId: string;
	title: string;
	url: string;
	thumbnail: string | null;
	length: number;
	userId?: string;
	username?: string;
	serverId: string;
}

export default Video;
