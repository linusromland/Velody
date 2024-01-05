// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';
import Video from '../interfaces/Video';
import Database from '../classes/Database';

export class SkipCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'skip',
			description: 'Skips the currently playing video.'
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

		new Database().addCommand(interaction, this.name);

		const channel: VoiceBasedChannel | null = (interaction?.member as GuildMember)?.voice?.channel;

		if (channel) {
			const server: Server = servers.get(interaction.guildId as string) as Server;

			if (!server) {
				embed.setTitle('Not connected to a voice channel');
				embed.setDescription('Use `/join` to connect to a voice channel');
				return embed.updateMessage();
			}

			const queue: Video[] = server.queue;
			const success: boolean = server.skip();

			if (success) {
				embed.setTitle(`Skipped \`${queue[0].title}\``);
				if (queue[1]) {
					embed.setDescription(`Up next: \`${queue[1].title}\``);
				}
			} else {
				embed.setTitle('Nothing to skip');
				embed.setDescription('The queue is empty');
			}

			embed.updateMessage();
		} else {
			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			embed.updateMessage();
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to skip the currently playing on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
