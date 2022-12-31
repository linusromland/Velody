import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { Message } from 'discord.js';

export class HelpCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, { ...options });
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('help').setDescription('Shows the help menu'));
	}

	public async chatInputRun(interaction: Command.ChatInputInteraction) {
		const msg = (await interaction.reply({
			content: 'Loading...',
			fetchReply: true
		})) as Message;

		if (isMessageInstance(msg)) {
			await msg.edit('Help menu');
		}
	}
}
