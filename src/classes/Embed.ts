// External dependencies
import { EmbedBuilder } from '@discordjs/builders';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, AnyComponentBuilder, Message } from 'discord.js';
import dayjs from 'dayjs';

// Internal dependencies
import Database from './Database';

export default class Embed {
	_embed: EmbedBuilder;
	_message: Message | undefined;
	_components: ActionRowBuilder<AnyComponentBuilder>[] = [];

	constructor() {
		this._embed = new EmbedBuilder();
		this._embed.setAuthor({
			name: 'Velody',
			iconURL: 'https://raw.githubusercontent.com/linusromland/Velody/master/assets/logo.jpeg',
			url: 'https://github.com/linusromland/Velody'
		});
		this._embed.setColor([124, 178, 190]);
	}

	async initMessage(interaction: Command.ChatInputCommandInteraction): Promise<boolean> {
		const userId = interaction.user.id;
		const guildId = interaction.guildId ?? 'unknown_guild_id';

		const timeout = await new Database().isTimeouted(userId, guildId);

		if (timeout) {
			const nextMessage = dayjs().add(timeout, 'milliseconds');

			this.setTitle('You are timeouted!');
			this.setDescription(`You can send a new command at ${nextMessage.format('HH:mm:ss')}.`);
			await interaction.reply({
				embeds: [this._embed],
				ephemeral: true
			});
			return false;
		}

		this.loading();
		this._message = (await interaction.reply({
			embeds: [this._embed],
			fetchReply: true
		})) as Message;

		return true;
	}

	updateMessage() {
		if (!this._message) return;
		// @ts-expect-error - This is a bug in the @discordjs/builders package
		this._message.edit({ embeds: [this._embed], components: this._components });
	}

	async setMessage(message: Message, userId: string, guildId: string): Promise<boolean> {
		this._message = message;

		const timeout = await new Database().isTimeouted(userId, guildId);

		if (!timeout) {
			return true;
		}

		return false;
	}

	loading(): Embed {
		this._embed.setTitle('Velody is thinking...');
		return this;
	}

	setTitle(title: string): Embed {
		this._embed.setTitle(title);
		return this;
	}

	setDescription(description: string): Embed {
		this._embed.setDescription(description);
		return this;
	}

	setURL(url: string): Embed {
		this._embed.setURL(url);
		return this;
	}

	setImage(url: string): Embed {
		this._embed.setImage(url);
		return this;
	}

	setThumbnail(url: string): Embed {
		this._embed.setThumbnail(url);
		return this;
	}

	addField(...fields: { name: string; value: string; inline: boolean }[]): Embed {
		this._embed.addFields(fields);
		return this;
	}

	addLoopSymbols(loopEnabled: boolean, loopQueueEnabled: boolean, voicePresenterEnabled: boolean): Embed {
		let voicePresenter = 'Not available';

		if (process.env.OPENAI_API_KEY) {
			voicePresenter = voicePresenterEnabled ? '✅' : '❌';
		}

		this._embed.setFooter({
			text: `Loop: ${loopEnabled ? '✅' : '❌'}\nLoop Queue: ${
				loopQueueEnabled ? '✅' : '❌'
			}\nVoice Presenter: ${voicePresenter}`
		});
		return this;
	}

	setFooter(text: string): Embed {
		this._embed.setFooter({ text });
		return this;
	}

	addComponents(...components: ActionRowBuilder<AnyComponentBuilder>[]) {
		this._components.push(...components);
	}
}
