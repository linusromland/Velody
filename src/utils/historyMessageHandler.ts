// External dependencies
import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message, User } from 'discord.js';

// Internal dependencies
import getTableSongRow from './getTableSongRow';
import Embed from '../classes/Embed';
import Database from '../classes/Database';

async function handleHistory(
	msg: Message,
	serverId: string,
	serverName: string,
	page: number,
	interactionUser?: User,
	user?: User
) {
	const embed: Embed = new Embed();

	const database = new Database();

	const limit = 10;

	if (!database.isActivated) {
		embed.setTitle('History is not activated');
		embed.setDescription('To activate history the bot hoster needs to set a MongoDB URI');
		return msg.edit({ embeds: [embed.embed] });
	}

	if (!serverId) {
		embed.setTitle('You are not connected to a server');
		embed.setDescription('Join a server and try again');
		return msg.edit({ embeds: [embed.embed] });
	}

	const history = await database.getHistory({
		guildId: serverId,
		userId: user?.id || undefined,
		skip: (page - 1) * limit,
		limit
	});
	const historyCount =
		(await database.getHistoryLength({
			guildId: serverId,
			userId: user?.id || undefined
		})) ?? 0;

	if (!history || history.length === 0) {
		embed.setTitle('No history found');
		embed.setDescription('Play some songs and try again');
		return msg.edit({ embeds: [embed.embed] });
	}

	const resultFor = user ? user.username : serverName;

	embed.setTitle(`__History for ${user ? 'user' : 'server'} **${resultFor}**__`);
	let description = '';

	for (let i = 0; i < history.length; i++) {
		const entry = history[i];

		const index = (page - 1) * limit + i + 1;

		description += getTableSongRow(entry.video, entry.createdAt, index, entry.userId);
	}
	embed.setDescription(description);

	const maxPage = Math.ceil(historyCount / limit);

	if (maxPage > 1) {
		embed.setFooter(`Page ${page}/${maxPage}`);

		const previousButton = new ButtonBuilder()
			.setCustomId(`historyPrevious-${page}-${user?.id || ''}`)
			.setLabel('Previous')
			.setDisabled(page === 1)
			.setStyle(ButtonStyle.Primary);

		const nextButton = new ButtonBuilder()
			.setCustomId(`historyNext-${page}-${user?.id || ''}`)
			.setLabel('Next')
			.setDisabled(page === maxPage)
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder().addComponents(previousButton, nextButton);

		// @ts-expect-error - This is a bug in the library
		msg.edit({ embeds: [embed.embed], components: [row] });
	} else {
		msg.edit({ embeds: [embed.embed] });
	}

	container.logger.info(
		`User ${interactionUser?.tag}(${interactionUser?.id}) requested the history of the bot on server ${serverName}(${serverId}). Page ${page}`
	);
}

export default handleHistory;
