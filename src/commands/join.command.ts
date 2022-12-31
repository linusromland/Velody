// External dependencies
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { Message } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';

export class JoinCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, { ...options });
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('join').setDescription('Joins the voice channel'));
	}

	public async chatInputRun(interaction: Command.ChatInputInteraction) {
		const msg = (await interaction.reply({
			content: 'Loading...',
			fetchReply: true
		})) as Message;

		if (isMessageInstance(msg)) {
			const server = new Server((interaction.member as any).voice.channel);

			await msg.edit('Help menu');
		}
	}
}
