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

	public removeAt(index: number): boolean | Video {
		try {
			if (index == 0) return false;

			return this.videos.splice(index, 1)[0];
		} catch (e) {
			return false;
		}
	}

	public clearQueue(): boolean {
		try {
			this.videos = [this.videos[0]];
			return true;
		} catch (e) {
			return false;
		}
	}

	public shuffleQueue(): boolean {
		try {
			if (this.videos.length <= 1) return false;
			//Shuffle all the videos except the first one
			this.videos = [this.videos[0], ...this.videos.slice(1).sort(() => Math.random() - Math.random())];
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
