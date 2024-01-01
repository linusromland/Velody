declare global {
	namespace NodeJS {
		interface ProcessEnv {
			BOT_TOKEN: string;
			YOUTUBE_API_KEY: string;
			OPENAI_API_KEY?: string;
			OPENAI_MODEL?: string;
			OPENAI_TTS_MODEL?: string;
			OPENAI_TTS_VOICE?: string;
			MONGODB_URI?: string;
		}
	}
}
