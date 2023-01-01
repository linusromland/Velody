// Internal dependencies
import Video from '../interfaces/Video';

export default class Queue {
	private videos: Video[];

	constructor() {
		this.videos = [];
	}

	public add(video: Video): void {
		this.videos.push(video);
	}

	get queue(): Video[] {
		return this.videos;
	}

	get current(): Video | null {
		return this.videos[0] || null;
	}
}
