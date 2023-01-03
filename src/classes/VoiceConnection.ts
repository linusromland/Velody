//External dependencies
import {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerState,
	AudioPlayer,
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
	private _playing: boolean = false;
	private _player: AudioPlayer | null = null;

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

	public async playVideo(video: Video): Promise<boolean> {
		if (!this._connection) return false;

		const stream: Readable = ytdl(video.url, {
			filter: 'audioonly'
		});

		this._player = createAudioPlayer();

		this._connection.subscribe(this._player);

		this._player.play(createAudioResource(stream));

		this._playing = true;

		this._player.on('stateChange', (_: AudioPlayerState, newState: AudioPlayerState) => {
			if (newState.status === 'idle') {
				this.removeFirst();
				this._playing = false;

				if (this.current) return this.playVideo(this.current as Video);
			}
		});

		this._player.on('error', (error: Error) => {
			if (error.message === 'aborted') {
				console.log('TODO: FIX THIS');
			}
		});

		return true;
	}

	public getDuration(): number {
		if (!this._player) return 0;
		if (!this._playing) return 0;
		const playerState: AudioPlayerState = this._player.state;

		if (playerState.status !== 'playing') return 0;

		if (!playerState.resource.playbackDuration) return 0;

		return Math.floor(playerState.resource.playbackDuration / 1000);
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

	get isPlaying(): boolean {
		return this._playing;
	}
}
