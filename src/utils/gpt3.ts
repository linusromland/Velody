import { Configuration, OpenAIApi } from 'openai';

const configuration: Configuration = new Configuration({
	organization: process.env.OPENAI_ORG,
	apiKey: process.env.OPENAI_KEY
});

const openai: OpenAIApi = new OpenAIApi(configuration);

const gpt3 = async (text: string): Promise<string> => {
	const response: any = await openai.createCompletion({
		model: 'text-davinci-003',
		prompt: text,
		max_tokens: 140,
		temperature: 0.9,
		stop: '"'
	});

	return response.data.choices[0].text;
};

export default gpt3;
