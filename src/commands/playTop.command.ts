// External dependencies
import { SlashCommandBuilder, SlashCommandStringOption } from '@discordjs/builders';
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, Message, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';
import youtubeSearch from '../utils/youtubeSearch';
import Video from '../interfaces/Video';
import getUser from '../utils/getUser';

export class PlayCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'playTop',
			description: 'Adds a video to the top of the queue.'
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option: SlashCommandStringOption) =>
					option.setName('query').setDescription('The video to search for').setRequired(true)
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

		if (isMessageInstance(msg) && channel) {
			let server: Server = servers.get(interaction.guildId as string) as Server;

			if (!server) {
				server = new Server(channel, interaction.guildId as string);
				servers.add(server);
			}

			if (server.connectedChannelId !== channel.id) server.join(channel);

			const results: Video[] | void = await youtubeSearch(interaction.options.getString('query') as string, false);

			if (results) {
				const result: Video = results[0];

				result.requestedBy = getUser(interaction);
				const added: {
					success: boolean;
					addedToQueue: boolean;
				} = await server.addVideo(result as Video, true);

				const { success, addedToQueue } = added;

				if (!success) {
					embed.setTitle('An error occurred');
					embed.setDescription('Try again later');
					msg.edit({ embeds: [embed.embed] });
					return;
				}

				if (addedToQueue) {
					embed.setTitle('Added `' + result.title + '` to the top of the queue');
					if (results.length > 1) embed.setDescription(`and ${results.length - 1} more`);
				} else {
					embed.setTitle('Playing `' + result.title + '`');
					if (results.length > 1) embed.setDescription(`Added ${results.length - 1} more to queue`);
				}

				if (result.thumbnail) embed.setImage(result.thumbnail);
				embed.setURL(result.url);
				msg.edit({ embeds: [embed.embed] });
			} else {
				embed.setTitle('No results found');
				embed.setDescription(
					'Try again with a different query\nPlease note that this command only searches for videos, playlists are not allowed.'
				);
				msg.edit({ embeds: [embed.embed] });
			}
		} else {
			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			msg.edit({ embeds: [embed.embed] });
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to play a video in the voice channel ${channel?.name}(${interaction?.id}) on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
