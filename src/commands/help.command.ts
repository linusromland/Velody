// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command } from '@sapphire/framework';

// Internal dependencies
import { Message } from 'discord.js';

export class HelpCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder.setName('help').setDescription('Shows the help menu')
		);
	}

	public async chatInputRun(interaction: Command.ChatInputInteraction) {
		const msg: Message<boolean> = (await interaction.reply({
			content: 'Loading...',
			fetchReply: true
		})) as Message;

		if (isMessageInstance(msg)) {
			await msg.edit('Help menu');
		}
	}
}
