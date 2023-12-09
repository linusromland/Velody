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

let openai: OpenAI;

const playTTS = (text: string, connection: VoiceConnection) => {
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
			const response = await openai.audio.speech.create({
				model: 'tts-1',
				voice: 'echo',
				input: text
			});

			const ArrayBuffer: ArrayBuffer = await response.arrayBuffer();

			const buffer: Buffer = Buffer.from(ArrayBuffer);

			// convert buffer to Readable stream
			const stream: Readable = Readable.from(buffer, { objectMode: false });

			const player: AudioPlayer = createAudioPlayer();

			connection.subscribe(player);

			const resource = createAudioResource(stream);

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
