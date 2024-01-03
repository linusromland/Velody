//External dependencies
import {
	createAudioPlayer,
	createAudioResource,
	AudioPlayer,
	VoiceConnection,
	AudioPlayerState
} from '@discordjs/voice';
import { Readable } from 'stream';
import OpenAI from 'openai';
import { container } from '@sapphire/framework';
import { SpeechCreateParams } from 'openai/resources/audio/speech';
import Database from '../classes/Database';

let openai: OpenAI;

const playTTS = (
	text: string,
	connection: VoiceConnection,
	database: Database,
	staticText = false,
	videoId?: string
) => {
	const { OPENAI_API_KEY } = process.env;

	if (!OPENAI_API_KEY) return;

	if (!openai) {
		openai = new OpenAI({
			apiKey: OPENAI_API_KEY
		});
	}

	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve: (value: unknown) => void) => {
		try {
			const { OPENAI_TTS_MODEL, OPENAI_TTS_VOICE } = process.env;

			let model = 'tts-1';
			let voice = 'echo';

			if (OPENAI_TTS_MODEL) {
				model = OPENAI_TTS_MODEL;
				container.logger.info(`Using OpenAI model ${model}`);
			}

			if (OPENAI_TTS_VOICE) {
				voice = OPENAI_TTS_VOICE;
				container.logger.info(`Using OpenAI voice ${voice}`);
			}

			let buffer = (await database.getCachedTTS(text))?.buffer;

			if (!buffer) {
				const response = await openai.audio.speech.create({
					model,
					voice: voice as SpeechCreateParams['voice'],
					input: text
				});

				const ArrayBuffer: ArrayBuffer = await response.arrayBuffer();

				buffer = Buffer.from(ArrayBuffer);

				await database.createTTSCache(buffer, text, staticText, videoId);
			}

			// convert buffer to Readable stream
			const stream: Readable = Readable.from(buffer, { objectMode: false });

			const player: AudioPlayer = createAudioPlayer();

			connection.subscribe(player);

			const resource = createAudioResource(stream, {
				inlineVolume: true
			});
			resource.volume?.setVolume(5);

			player.play(resource);

			player.on('stateChange', (_: AudioPlayerState, newState: AudioPlayerState) => {
				if (newState.status === 'idle') {
					player.stop();
					resolve(true);
				}
			});
		} catch (err) {
			console.error(err);
			resolve(false);
		}
	});
};

export default playTTS;
