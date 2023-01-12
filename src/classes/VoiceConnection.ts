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
import { exec as ytdlexec } from 'youtube-dl-exec';
import { ExecaChildProcess } from 'execa';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth';

//Internal dependencies
import Queue from './Queue';
import Video from '../interfaces/Video';

export default class VoiceConnection extends Queue {
	private _connection: DiscordVoiceConnection | null = null;
	private _playing: boolean = false;
	private _player: AudioPlayer | null = null;
	private _loop: boolean = false;
	private _loopQueue: boolean = false;

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

	public async playVideo(video: Video | Readable): Promise<boolean> {
		if (!this._connection) return false;

		let toPlay: Readable;

		//Check if video is of type Readable
		if (video instanceof Readable) {
			toPlay = video;
		} else {
			const stream: ExecaChildProcess = ytdlexec(
				video.url,
				{
					output: '-',
					format: 'bestaudio',
					limitRate: '1M',
					rmCacheDir: true,
					verbose: true
				},
				{ stdio: ['ignore', 'pipe', 'pipe'] }
			);

			toPlay = stream.stdout as Readable;
		}

		this._player = createAudioPlayer();

		this._connection.subscribe(this._player);

		this._player.play(createAudioResource(toPlay));

		this._playing = true;

		this._player.on('stateChange', (_: AudioPlayerState, newState: AudioPlayerState) => {
			if (newState.status === 'idle') {
				if (!this._loop && this._loopQueue) this.add(this.current as Video);
				if (!this._loop) this.removeFirst();
				this._playing = false;

				if (this.current) return this.playVideo(this.current as Video);
				else this.leave();
			}
		});

		this._player.on('error', (error: Error) => {
			console.error(error);
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

	public skip(): boolean {
		if (!this._player) return false;
		if (!this._playing) return false;
		this._player.stop();
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

	get isPlaying(): boolean {
		return this._playing;
	}

	get loop(): boolean {
		return this._loop;
	}

	set loop(value: boolean) {
		this._loop = value;
	}

	get loopQueue(): boolean {
		return this._loopQueue;
	}

	set loopQueue(value: boolean) {
		this._loopQueue = value;
	}
}
