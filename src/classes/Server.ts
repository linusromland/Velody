// External dependencies
import { VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import VoiceConnection from './VoiceConnection';

export default class Server extends VoiceConnection {
	constructor(channel: VoiceBasedChannel) {
		super(channel);
	}
}
