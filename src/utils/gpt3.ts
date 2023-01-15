import { Configuration, OpenAIApi, CreateCompletionResponse } from 'openai';
import { AxiosResponse } from 'axios';

const configuration: Configuration = new Configuration({
	organization: process.env.OPENAI_ORG,
	apiKey: process.env.OPENAI_KEY
});

const openai: OpenAIApi = new OpenAIApi(configuration);

const gpt3 = async (text: string): Promise<string | undefined> => {
	const response: AxiosResponse<CreateCompletionResponse> = await openai.createCompletion({
		model: 'text-davinci-003',
		prompt: text,
		max_tokens: 140,
		temperature: 0.9,
		stop: '"'
	});

	if (response?.data?.choices[0]?.text) {
		console.log(response.data.choices[0].text);
		return response.data.choices[0].text;
	} else {
		return undefined;
	}
};

const createPrompt = (input: { previousSong?: string; nextSong: string; requestedBy: string }): string => {
	const { previousSong, nextSong } = input;

	return `Write a dj callout for a discord bot based on the following information. The callout should be fun and mention the requestor:
		${previousSong ? `Previous song: ${previousSong}` : ''}
		Next song: ${nextSong}
		Requestor: ${input.requestedBy.split('#')[0]}
		Callout: "`;
};

export { gpt3, createPrompt };
