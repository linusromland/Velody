import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import historyMessageHandler from '../utils/historyMessageHandler';

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
		const msg = await interaction.channel?.messages.fetch(interaction.message.id);
		if (!msg) return;

		const isNext = interaction.customId.includes('historyNext');

		const page = parseInt(interaction.customId.split('-')[1]);
		const userId = interaction.customId.split('-')[2];

		const user = userId !== '' && (await interaction.client.users.fetch(userId));

		await historyMessageHandler(
			msg,
			interaction.guildId as string,
			interaction.guild?.name as string,
			isNext ? page + 1 : page - 1,
			interaction.user,
			user || undefined
		);
		await interaction.deferUpdate();
	}
}
