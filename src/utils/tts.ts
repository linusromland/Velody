//External dependencies
import {
	createAudioPlayer,
	createAudioResource,
	AudioPlayer,
	VoiceConnection,
	AudioPlayerState
} from '@discordjs/voice';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth';
import { Readable } from 'stream';
import fs from 'fs';
import { container } from '@sapphire/framework';

const playTTS = (text: string, connection: VoiceConnection) => {
	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve: (value: unknown) => void) => {
		try {
			if (!process.env.GOOGLE_AUTH_FILE) {
				container.logger.error('GOOGLE_AUTH_FILE is not set');
				resolve(false);
				return;
			}

			if (!fs.existsSync(process.env.GOOGLE_AUTH_FILE)) {
				container.logger.error('GOOGLE_AUTH_FILE does not exist');
				resolve(false);
				return;
			}

			const auth: GoogleAuth<JSONClient> = new google.auth.GoogleAuth({
				keyFile: process.env.GOOGLE_AUTH_FILE,
				scopes: ['https://www.googleapis.com/auth/cloud-platform']
			});

			const ttsClient: TextToSpeechClient = new TextToSpeechClient({
				auth
			});

			const [response] = await ttsClient.synthesizeSpeech({
				audioConfig: {
					audioEncoding: 'LINEAR16',
					effectsProfileId: ['large-home-entertainment-class-device'],
					pitch: 0,
					speakingRate: 1
				},
				input: {
					text: text
				},
				voice: {
					languageCode: 'en-GB',
					name: 'en-GB-Neural2-A'
				}
			});

			if (!response.audioContent) return !!connection;

			// convert type binary mp3 to Readable stream
			const stream: Readable = Readable.from(response.audioContent, { objectMode: false });

			const player: AudioPlayer = createAudioPlayer();

			connection.subscribe(player);

			player.play(createAudioResource(stream));

			player.on('stateChange', (oldState: AudioPlayerState, newState: AudioPlayerState) => {
				if (newState.status === 'idle' && oldState.status !== 'idle') {
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
