// External dependencies
import { VoiceBasedChannel } from 'discord.js';

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
}
