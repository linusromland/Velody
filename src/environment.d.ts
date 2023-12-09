declare global {
	namespace NodeJS {
		interface ProcessEnv {
			BOT_TOKEN: string;
			YOUTUBE_API_KEY: string;
			OPENAI_API_KEY?: string;
		}
	}
}