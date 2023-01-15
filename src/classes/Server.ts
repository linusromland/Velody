// External dependencies
import { VoiceBasedChannel } from 'discord.js';
import Video from '../interfaces/Video';
import playTTS from '../utils/tts';

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

	public async play(input: { nextSong?: string; requestedBy?: string } | undefined): Promise<boolean> {
		if (!this.current) return false;
		if (input && input.nextSong && input.requestedBy)
			await this.tts({ nextSong: input.nextSong, requestedBy: input.requestedBy });
		return await this.playVideo(this.current);
	}

	public async addVideo(video: Video, top: boolean = false): Promise<{ success: boolean; addedToQueue: boolean }> {
		if (top && this.queue.length > 0) {
			//Add to queue on position 1
			this.queue.splice(1, 0, video);
			return { success: true, addedToQueue: true };
		}

		const result: { success: boolean; addedToQueue: boolean } = this.add(video);

		if (result.success && !this.isPlaying)
			this.play({
				nextSong: this.current?.title,
				requestedBy: this.current?.requestedBy
			});

		return result;
	}
}
