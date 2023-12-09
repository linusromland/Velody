// External Dependencies
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

let openai: OpenAI;

const gpt3 = async (text: ChatCompletionMessageParam[]): Promise<string | undefined> => {
	const { OPENAI_API_KEY } = process.env;

	if (!OPENAI_API_KEY) return;

	if (!openai) {
		openai = new OpenAI({
			apiKey: OPENAI_API_KEY
		});
	}

	try {
		const response = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: text,
			max_tokens: 140
		});

		if (response.choices[0]?.message.content) {
			return response.choices[0].message.content || undefined;
		} else {
			return undefined;
		}
	} catch (error) {
		throw 'GPT-3 failed to generate a response.';
	}
};

const createPrompt = (input: {
	previousSong?: string;
	nextSong: string;
	requestedBy: string;
}): ChatCompletionMessageParam[] => {
	const { previousSong, nextSong } = input;

	const messages: ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: `Write a dj callout for a discord bot based on the following information.
		The callout should be fun and mention the requestor.
		The callout should be no more than 140 characters.
		The callout should not include any special characters.
		Roast the requestor very hard.
		Be funny, add whatever you want to the callout.`
		},
		{
			role: 'user',
			content: `${previousSong ? `Previous song: ${previousSong}` : ''}
			Next song: ${nextSong}
			Requestor: ${input.requestedBy.split('#')[0]}`
		}
	];

	return messages;
};

export { gpt3, createPrompt };
