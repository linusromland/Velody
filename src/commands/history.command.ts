// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { SlashCommandUserOption } from 'discord.js';

// Internal dependencies
import Embed from '../classes/Embed';
import handleHistory from '../utils/historyMessageHandler';
import Database from '../classes/Database';

export class HistoryCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'history',
			description: 'Shows the history of the bot.'
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option: SlashCommandUserOption) =>
					option.setName('user').setDescription('The user to show the history for').setRequired(false)
				)
		);
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const embed: Embed = new Embed();
		if (!(await embed.initMessage(interaction))) return;
		new Database().addCommand(interaction, this.name);

		await handleHistory(
			embed,
			interaction.guildId as string,
			interaction.guild?.name as string,
			1,
			interaction.user,
			interaction.options.getUser('user') || undefined
		);
	}
}
