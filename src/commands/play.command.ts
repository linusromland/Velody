// External dependencies
import { SlashCommandBuilder, SlashCommandStringOption } from '@discordjs/builders';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';
import youtubeSearch from '../utils/youtubeSearch';
import Video from '../interfaces/Video';
import getUser from '../utils/getUser';
import Database from '../classes/Database';

export class PlayCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'play',
			description: 'Plays a video with the given name or URL.'
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
		if (!(await embed.initMessage(interaction))) return;

		const channel: VoiceBasedChannel | null = (interaction?.member as GuildMember)?.voice?.channel;

		if (channel) {
			let server: Server = servers.get(interaction.guildId as string) as Server;

			if (!server) {
				server = new Server(channel, interaction.guildId as string);
				servers.add(server);
			}

			if (server.connectedChannelId !== channel.id) server.join(channel);
			try {
				const results: Video[] | void = await youtubeSearch(
					interaction.options.getString('query') as string,
					interaction.guildId as string
				);

				if (results) {
					let success: boolean = true;
					let addedToQueue: boolean = false;

					// Add requested by
					for (const [index, result] of results.entries()) {
						result.userId = interaction.user.id;
						result.username = getUser(interaction);
						const added: {
							success: boolean;
							addedToQueue: boolean;
						} = await server.addVideo(result as Video);

						if (index === 0 && added.addedToQueue) addedToQueue = true;

						if (!added.success) success = false;
					}

					if (!success) {
						new Database().addCommand(interaction, this.name, {
							channel: channel.id,
							query: interaction.options.getString('query') as string,
							success: false
						});

						embed.setTitle('An error occurred');
						embed.setDescription('Try again later');
						embed.updateMessage();
						return;
					}

					const result: Video = results[0];

					new Database().addCommand(interaction, this.name, {
						channel: channel.id,
						query: interaction.options.getString('query') as string,
						name: result.title,
						success: true,
						addedToQueue
					});

					if (addedToQueue) {
						embed.setTitle('Added `' + result.title + '` to queue');
						if (results.length > 1) embed.setDescription(`and ${results.length - 1} more`);
					} else {
						embed.setTitle('Playing `' + result.title + '`');
						if (results.length > 1) embed.setDescription(`Added ${results.length - 1} more to queue`);
					}

					if (result.thumbnail) embed.setImage(result.thumbnail);
					embed.setURL(result.url);
					embed.updateMessage();
				} else {
					new Database().addCommand(interaction, this.name, {
						channel: channel.id,
						query: interaction.options.getString('query') as string,
						success: false
					});

					embed.setTitle('No results found');
					embed.setDescription('Try again with a different query');
					embed.updateMessage();
				}
			} catch (error) {
				embed.setTitle('An error occurred');
				embed.setDescription('Try again later');
				embed.updateMessage();
				return;
			}
		} else {
			new Database().addCommand(interaction, this.name);

			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			embed.updateMessage();
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to play a video in the voice channel ${channel?.name}(${interaction?.id}) on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
