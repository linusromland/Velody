interface Video {
	title: string;
	url: string;
	thumbnail: string | null;
	length: string | null;
	requestedBy?: string;
}

export default Video;
