// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';
import Database from '../classes/Database';

export class JoinCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'join',
			description: 'Summons the bot to your voice channel.'
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder.setName(this.name).setDescription(this.description)
		);
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const embed: Embed = new Embed();
		if (!(await embed.initMessage(interaction))) return;

		const channel: VoiceBasedChannel | null = (interaction?.member as GuildMember)?.voice?.channel;

		if (channel) {
			new Database().addCommand(interaction, this.name, {
				channel: channel.id
			});
			let server: Server = servers.get(interaction.guildId as string) as Server;

			if (!server) {
				server = new Server(channel, interaction.guildId as string);
				servers.add(server);
			}

			if (server.connectedChannelId === channel.id) {
				embed.setTitle('Already connected to `' + channel.name + '`');
				embed.setDescription('Use `/play <video>` to play a video');
				return embed.updateMessage();
			}

			server.join(channel);
			embed.setTitle('Joined `' + channel.name + '`');
			embed.setDescription('Use `/play <video>` to play a video');
			embed.updateMessage();
		} else {
			new Database().addCommand(interaction, this.name);

			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			embed.updateMessage();
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to join the voice channel ${channel?.name}(${interaction?.id}) on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
