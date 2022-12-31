// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, Message, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';

export class LeaveCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder.setName('leave').setDescription('Leaves the voice channel')
		);
	}

	public async chatInputRun(interaction: Command.ChatInputInteraction) {
		const embed: Embed = new Embed();
		embed.loading();
		const msg: Message<boolean> = (await interaction.reply({
			embeds: [embed.embed],
			fetchReply: true
		})) as Message;

		const channel: VoiceBasedChannel | null = (interaction?.member as GuildMember)?.voice?.channel;

		if (isMessageInstance(msg) && channel) {
			const server: Server = servers.get(interaction.guildId as string) as Server;

			if (server?.connectedChannelId === channel.id && (await server.leave())) {
				embed.setTitle('Left `' + channel.name + '`');
				embed.setDescription('Use `/join` to add me back');
				return msg.edit({ embeds: [embed.embed] });
			}

			embed.setTitle("I'm not connected to any voice channel");
			embed.setDescription('Use `/join` to join a voice channel');
			msg.edit({ embeds: [embed.embed] });
		} else {
			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			msg.edit({ embeds: [embed.embed] });
		}
	}
}