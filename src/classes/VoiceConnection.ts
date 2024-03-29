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
import { container } from '@sapphire/framework';
import fs from 'fs';

//Internal dependencies
import Queue from './Queue';
import Video from '../interfaces/Video';
import playTTS from '../utils/tts';
import { createPrompt, gpt3 } from '../utils/gpt3';
import { ChatCompletionMessageParam } from 'openai/resources';
import { setDefaultStatus, setPlayingStatus } from '../utils/status';
import Database from './Database';
import { getCacheFileName } from '../utils/getCacheFileName';
import cacheCleanup from '../utils/cacheCleanup';

export default class VoiceConnection extends Queue {
	private _connection: DiscordVoiceConnection | null = null;
	private _playing: boolean = false;
	private _player: AudioPlayer | null = null;
	private _loop: boolean = false;
	private _loopQueue: boolean = false;
	private _voicePresenter: boolean = true;
	private _gpt3: boolean = true;
	private _database: Database;
	private _previousSong: Video | undefined;

	public constructor(channel: VoiceBasedChannel) {
		super();
		this.join(channel);
		this._database = new Database();
	}

	public async join(channel: VoiceBasedChannel): Promise<boolean> {
		const connection: DiscordVoiceConnection = await joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,
			selfDeaf: true
		});

		this._connection = connection;

		return !!connection;
	}

	public async playVideo(video: Video | Readable): Promise<boolean> {
		if (!this._connection) return false;

		const promises = [];

		if (this.current && this.current.title && this.current.username)
			promises.push(
				this.tts({
					previousSong: this._previousSong?.title,
					nextSong: this.current.title,
					requestedBy: this.current.username,
					videoId: this.current.videoId
				})
			);

		let toPlay: Readable | null = null;

		//Check if video is of type Readable
		if (video instanceof Readable) {
			toPlay = video;
		} else {
			this._database.addHistory(video);

			const cacheFile = getCacheFileName(video.videoId);

			if (!fs.existsSync(cacheFile)) {
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

				const writeStream: fs.WriteStream = fs.createWriteStream(cacheFile);
				stream.stdout?.pipe(writeStream);

				promises.push(
					new Promise((resolve) => {
						stream.on('close', () => {
							cacheCleanup(this._database);
							resolve(true);
						});
					})
				);
			}
		}

		this._playing = true;

		await Promise.all(promises);

		if (!toPlay && !(video instanceof Readable)) {
			const cacheFile = getCacheFileName(video.videoId);
			toPlay = fs.createReadStream(cacheFile);
		}

		if (!toPlay) return false;

		this._player = createAudioPlayer();

		this._connection.subscribe(this._player);

		this._player.play(createAudioResource(toPlay));

		if (!(video instanceof Readable)) {
			setPlayingStatus(container.client, video);
		}

		this._player.on('stateChange', async (_: AudioPlayerState, newState: AudioPlayerState) => {
			if (newState.status === 'idle') {
				const previousSong: Video | undefined = this.current as Video | undefined;
				this._previousSong = previousSong;

				if (!this._loop && this._loopQueue) this.add(this.current as Video);
				if (!this._loop) this.removeFirst();
				this._playing = false;

				if (this.current && this.current?.title && this.current.username) {
					return this.playVideo(this.current as Video);
				} else {
					await this.tts('Queue is empty. Goodbye');
					return this.leave();
				}
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
		setDefaultStatus(container.client);

		if (this._connection) {
			this._connection.destroy();
			this._connection = null;
			return true;
		}

		return false;
	}

	public async tts(input: { previousSong?: string; nextSong: string; requestedBy: string; videoId: string } | string) {
		try {
			if (!this._connection || !this._voicePresenter) return false;
			if (typeof input === 'string')
				return playTTS(input, this._connection as DiscordVoiceConnection, this._database, true);

			if (!this._gpt3 || !process.env.OPENAI_API_KEY) {
				if (!input.previousSong)
					return playTTS(
						`Playing ${input.nextSong}. Requested by ${input.requestedBy}`,
						this._connection as DiscordVoiceConnection,
						this._database,
						true
					);
				return playTTS(
					`Next up is ${input.nextSong} requested by ${input.requestedBy}. Previously played ${input.previousSong}`,
					this._connection as DiscordVoiceConnection,
					this._database,
					true
				);
			}

			try {
				const prompt: ChatCompletionMessageParam[] = createPrompt({
					previousSong: input.previousSong,
					nextSong: input.nextSong,
					requestedBy: input.requestedBy
				});

				const text: string | undefined = await gpt3(prompt);

				if (!text)
					return playTTS('Something went wrong', this._connection as DiscordVoiceConnection, this._database, true);

				return playTTS(text, this._connection as DiscordVoiceConnection, this._database, false, input.videoId);
			} catch (error) {
				container.logger.error('Error while using GPT-3', error);
				return;
			}
		} catch (error) {
			console.error(error);
		}
	}

	public async getLastTTSMessage() {
		return await this._database.getLastTTSMessage();
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

	get voicePresenter(): boolean {
		return this._voicePresenter;
	}

	set voicePresenter(value: boolean) {
		if (this._playing) {
			this._voicePresenter = value;
			return;
		}

		if (value) {
			this._voicePresenter = value;
			this.tts(`Voice presenter enabled`);
		} else {
			this.tts(`Voice presenter disabled`);
			this._voicePresenter = value;
		}
	}

	get gpt3(): boolean {
		return this._gpt3;
	}

	set gpt3(value: boolean) {
		if (this._playing) {
			this._gpt3 = value;
			return;
		}

		if (value) {
			this._gpt3 = value;
			this.tts(`G P T 3 enabled`);
		} else {
			this.tts(`G P T 3 disabled`);
			this._gpt3 = value;
		}
	}

	get voiceConnection(): DiscordVoiceConnection | null {
		return this._connection;
	}
}
