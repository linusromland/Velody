// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command, CommandStore } from '@sapphire/framework';

// Internal dependencies
import Embed from '../classes/Embed';
import { Message } from 'discord.js';

export class HelpCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'help',
			description: 'Shows all the available commands and how to use them.'
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder.setName(this.name).setDescription(this.description)
		);
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const embed: Embed = new Embed();
		embed.loading();
		const msg: Message<boolean> = (await interaction.reply({
			embeds: [embed.embed],
			fetchReply: true
		})) as Message;

		if (isMessageInstance(msg)) {
			const commands: CommandStore = this.container.stores.get('commands');

			embed.setTitle('Available commands');

			for (const command of commands.values()) {
				if (command.name !== 'help') {
					embed.addField(`/${command.name}`, command.description, false);
				}
			}

			msg.edit({ embeds: [embed.embed] });
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to show help on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
