// Internal dependencies
import Video from '../interfaces/Video';

export default class Queue {
	private videos: Video[];

	constructor() {
		this.videos = [];
	}

	public add(video: Video): {
		success: boolean;
		addedToQueue: boolean;
	} {
		try {
			this.videos.push(video);

			return {
				success: true,
				addedToQueue: this.videos.length > 1
			};
		} catch (e) {
			return {
				success: false,
				addedToQueue: false
			};
		}
	}

	public removeFirst(): boolean {
		try {
			this.videos.shift();
			return true;
		} catch (e) {
			return false;
		}
	}

	get queue(): Video[] {
		return this.videos;
	}

	get current(): Video | null {
		return this.videos[0] || null;
	}
}
