// External dependencies
import { SlashCommandBuilder } from '@discordjs/builders';
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { GuildMember, Message, VoiceBasedChannel } from 'discord.js';

// Internal dependencies
import Server from '../classes/Server';
import servers from '../utils/servers';
import Embed from '../classes/Embed';

export class JoinCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options
		});
	}

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder.setName('join').setDescription('Joins the voice channel')
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

			if (server.connectedChannelId === channel.id) {
				embed.setTitle('Already connected to `' + channel.name + '`');
				embed.setDescription('Use `/play <song>` to play a song');
				return msg.edit({ embeds: [embed.embed] });
			}

			server.join(channel);
			embed.setTitle('Joined `' + channel.name + '`');
			embed.setDescription('Use `/play <song>` to play a song');
			msg.edit({ embeds: [embed.embed] });
		} else {
			embed.setTitle('You are not connected to a voice channel');
			embed.setDescription('Join a voice channel and try again');
			msg.edit({ embeds: [embed.embed] });
		}

		this.container.logger.info(
			`User ${interaction?.user?.tag}(${interaction?.user?.id}) requested the bot to join the voice channel ${channel?.name}(${interaction?.id}) on server ${interaction.guild?.name}(${interaction.guildId})`
		);
	}
}
