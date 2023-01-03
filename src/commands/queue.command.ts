// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, Message, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';
import Video from '../interfaces/Video';
import formatTime from '../utils/formatTime';

export class QueueCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'queue',
			description: 'View the queue.'
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder.setName(this.name).setDescription(this.description)
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

		if (!isMessageInstance(msg)) return;

		if (channel) {
			const server: Server = servers.get(interaction.guildId as string) as Server;

			if (!server) {
				embed.setTitle('Not connected to a voice channel');
				embed.setDescription('Use `/join` to connect to a voice channel');
				return msg.edit({ embeds: [embed.embed] });
			}

			const queue: Video[] = server.queue;

			if (queue && queue.length > 0) {
				embed.setTitle('Current queue');
				let description: string = `__Now Playing:__
        [${queue[0].title}](${queue[0].url}) - ${formatTime(queue[0].length)}
        \n`;

				if (queue.length > 1) {
					description += '__Up next:__\n';
					for (let i: number = 1; i < (queue.length > 10 ? 11 : queue.length); i++) {
						description +=
							'``' + i + '.``' + ` [${queue[i].title}](${queue[i].url}) - ${formatTime(queue[i].length)}\n`;
					}
					if (queue.length > 10) description += 'and ' + (queue.length - 10) + ' more...';
				} else {
					description += 'No more videos in queue';
				}

				embed.setDescription(description);
				embed.addLoopSymbols(server.loop, server.loopQueue);
			} else {
				embed.setTitle('No videos in queue');
				embed.setDescription('Use `/play` to add videos to the queue');
			}

			msg.edit({ embeds: [embed.embed] });
		} else {
			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			msg.edit({ embeds: [embed.embed] });
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to show the queue on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
