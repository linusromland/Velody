// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, VoiceBasedChannel } from 'discord.js';
import progressBar from 'string-progressbar';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';
import Video from '../interfaces/Video';
import formatTime from '../utils/formatTime';
import Database from '../classes/Database';

export class NowPlayingCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'nowplaying',
			description: 'Shows what video the bot is currently playing.'
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

			const current: Video | null = server.current;

			if (!current) {
				embed.setTitle('Nothing is playing');
				embed.setDescription('Use `/play <video>` to play a video');
				return embed.updateMessage();
			}

			embed.setTitle(`Playing \`${current.title}\``);

			let description: string = ``;

			if (current.thumbnail) embed.setThumbnail(current.thumbnail);
			const duration: number | null = server.getDuration();

			if (duration != null) {
				const progress: string = progressBar.splitBar(
					current.length,
					duration < current.length * 0.05 ? current.length * 0.05 : duration,
					20
				)[0];
				description += `${progress}\n \`${formatTime(current.length, duration)}\`\n`;
			}
			if (current.username) description += `Requested by: <@${current.userId}>`;
			embed.setDescription(description);
			embed.setURL(current.url);
			embed.addLoopSymbols(server.loop, server.loopQueue, server.voicePresenter);

			embed.updateMessage();
		} else {
			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			embed.updateMessage();
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to show currently playing on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
