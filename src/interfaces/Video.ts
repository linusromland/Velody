interface Video {
	title: string;
	url: string;
	thumbnail: string | null;
	length: number;
	requestedBy?: string;
}

export default Video;
