// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';
import Database from '../classes/Database';

export class LoopCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'loop',
			description: 'Loop the currently playing video.'
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

			const server: Server = servers.get(interaction.guildId as string) as Server;

			if (!server) {
				embed.setTitle('Not connected to a voice channel');
				embed.setDescription('Use `/join` to connect to a voice channel');
				return embed.updateMessage();
			}

			server.loop = !server.loop;

			embed.setTitle(`${server.loop ? '✅ Enabled' : '❌ Disabled'} loop!`);
			embed.setDescription('Use `/loop` to toggle loop');
			embed.updateMessage();
		} else {
			new Database().addCommand(interaction, this.name);

			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			embed.updateMessage();
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to loop on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
