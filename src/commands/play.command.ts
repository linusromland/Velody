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
import ytsr from 'ytsr';
import Video from '../interfaces/Video';

export class PlayCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			name: 'play',
			description: 'Searches for a song and plays it'
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option: SlashCommandStringOption) =>
					option.setName('query').setDescription('The song to search for').setRequired(true)
				)
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
			let server: Server = servers.get(interaction.guildId as string) as Server;

			if (!server) {
				server = new Server(channel, interaction.guildId as string);
				servers.add(server);
			}

			if (server.connectedChannelId !== channel.id) server.join(channel);

			const result: Video | undefined = await youtubeSearch(interaction.options.getString('query') as string);

			if (result) {
				result.requestedBy = interaction.user.tag;
				server.add(result as Video);
				server.play(() => {
					console.log('Song ended');
				});
				embed.setTitle('Playing `' + result.title + '`');
				if (result.thumbnail) embed.setImage(result.thumbnail);
				embed.setURL(result.url);
				msg.edit({ embeds: [embed.embed] });
				return;
			} else {
				embed.setTitle('No results found');
				embed.setDescription('Try again with a different query');
				msg.edit({ embeds: [embed.embed] });
				return;
			}
		} else {
			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			msg.edit({ embeds: [embed.embed] });
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to play a song in the voice channel ${channel?.name}(${interaction?.id}) on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
