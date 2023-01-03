// External dependencies
import { VoiceBasedChannel } from 'discord.js';
import Video from '../interfaces/Video';

// Internal dependencies
import VoiceConnection from './VoiceConnection';

export default class Server extends VoiceConnection {
	private _id: string | undefined;

	constructor(channel: VoiceBasedChannel, id: string) {
		super(channel);
		this._id = id;
	}

	get id(): string | undefined {
		return this._id;
	}

	public async play(): Promise<boolean> {
		if (!this.current) return false;
		return await this.playVideo(this.current);
	}

	public addVideo(video: Video): { success: boolean; addedToQueue: boolean } {
		const result: { success: boolean; addedToQueue: boolean } = this.add(video);
		if (result.success && !this.isPlaying) this.play();
		return result;
	}
}
