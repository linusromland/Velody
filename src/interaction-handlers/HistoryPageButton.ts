import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { type ButtonInteraction } from 'discord.js';
import historyMessageHandler from '../utils/historyMessageHandler';
import Database from '../classes/Database';
import Embed from '../classes/Embed';

export class HistoryButtonHandler extends InteractionHandler {
	public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.includes('historyNext') && !interaction.customId.includes('historyPrevious'))
			return this.none();

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const message = await interaction.channel?.messages.fetch(interaction.message.id);
		if (!message) return;

		const isNext = interaction.customId.includes('historyNext');

		new Database().addCommand(interaction, isNext ? 'historyNext' : 'historyPrevious');

		const page = parseInt(interaction.customId.split('-')[1]);
		const userId = interaction.customId.split('-')[2];
		const user = userId !== '' && (await interaction.client.users.fetch(userId));

		const senderUserId = interaction.user.id;
		const guildId = interaction.guildId ?? 'unknown_guild_id';

		const embed = new Embed();
		if (!(await embed.setMessage(message, senderUserId, guildId))) return;

		await historyMessageHandler(
			embed,
			guildId,
			interaction.guild?.name as string,
			isNext ? page + 1 : page - 1,
			interaction.user,
			user || undefined
		);
		await interaction.deferUpdate();
	}
}
