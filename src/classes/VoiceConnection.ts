//External dependencies
import {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerState,
	AudioResource,
	AudioPlayer,
	StreamType,
	VoiceConnection as DiscordVoiceConnection
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { Readable } from 'stream';
import ytdl from 'ytdl-core';

//Internal dependencies
import Queue from './Queue';
import Video from '../interfaces/Video';

export default class VoiceConnection extends Queue {
	private _connection: DiscordVoiceConnection | null = null;

	public constructor(channel: VoiceBasedChannel) {
		super();
		this.join(channel);
	}

	public async join(channel: VoiceBasedChannel): Promise<boolean> {
		const connection: DiscordVoiceConnection = await joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator
		});

		//Deafen the bot
		await channel.guild.me?.voice.setDeaf(true);

		this._connection = connection;

		return !!connection;
	}

	public async playVideo(video: Video, callback: () => void): Promise<boolean> {
		if (!this._connection) return false;

		const stream: Readable = ytdl(video.url, {
			filter: 'audioonly'
		});

		const player: AudioPlayer = createAudioPlayer();

		this._connection.subscribe(player);

		player.play(createAudioResource(stream));

		player.on('stateChange', (_: AudioPlayerState, newState: AudioPlayerState) => {
			if (newState.status === 'idle') {
				callback();
			}
		});

		return true;
	}

	public async leave(): Promise<boolean> {
		if (this._connection) {
			this._connection.destroy();
			this._connection = null;
			return true;
		}

		return false;
	}

	get connectedChannelId(): string | null {
		if (!this._connection) return null;
		return this._connection?.joinConfig?.channelId;
	}
}
