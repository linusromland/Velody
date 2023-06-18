// External dependencies
import { SlashCommandBuilder, SlashCommandNumberOption } from '@discordjs/builders';
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, Message, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';
import Video from '../interfaces/Video';

export class RemoveCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'remove',
			description: 'Removes from queue at location. If position is not passed, will clear entire queue.'
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addNumberOption((option: SlashCommandNumberOption) =>
					option.setName('position').setDescription('If empty, will clear entire queue').setRequired(false)
				)
		);
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const embed: Embed = new Embed();
		embed.loading();
		const msg: Message<boolean> = (await interaction.reply({
			embeds: [embed.embed],
			fetchReply: true
		})) as Message;

		const channel: VoiceBasedChannel | null = (interaction?.member as GuildMember)?.voice?.channel;

		if (!isMessageInstance(msg)) return;

		if (channel) {
			const server: Server = servers.get(interaction.guildId as string) as Server;

			if (!server) {
				embed.setTitle('Not connected to a voice channel');
				embed.setDescription('Use `/join` to connect to a voice channel');
				return msg.edit({ embeds: [embed.embed] });
			}

			const position: number | null = interaction.options.getNumber('position');

			if (position) {
				const success: boolean | Video = server.removeAt(position);

				if (!success) {
					embed.setTitle('Invalid position');
					embed.setDescription('Use `/queue` to see the queue');
					return msg.edit({ embeds: [embed.embed] });
				}

				embed.setTitle(`Removed \`${(success as Video).title}\` from queue`);
				embed.setDescription('Use `/queue` to see the queue');
			} else {
				const success: boolean = server.clearQueue();

				if (!success) {
					embed.setTitle('Error');
					embed.setDescription('Could not clear queue');
					return msg.edit({ embeds: [embed.embed] });
				}

				embed.setTitle('Cleared queue');
				embed.setDescription('Use `/queue` to see the queue');
			}

			msg.edit({ embeds: [embed.embed] });
		} else {
			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			msg.edit({ embeds: [embed.embed] });
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to remove from queue on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
