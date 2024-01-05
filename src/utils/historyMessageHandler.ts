// External dependencies
import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, User } from 'discord.js';

// Internal dependencies
import getTableSongRow from './getTableSongRow';
import Embed from '../classes/Embed';
import Database from '../classes/Database';

async function handleHistory(
	embed: Embed,
	serverId: string,
	serverName: string,
	page: number,
	interactionUser?: User,
	user?: User
) {
	const database = new Database();

	const limit = 10;

	if (!database.isActivated) {
		embed.setTitle('History is not activated');
		embed.setDescription('To activate history the bot hoster needs to set a MongoDB URI');
		return embed.updateMessage();
	}

	if (!serverId) {
		embed.setTitle('You are not connected to a server');
		embed.setDescription('Join a server and try again');
		return embed.updateMessage();
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
		return embed.updateMessage();
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

		embed.addComponents(row);
		embed.updateMessage();
	} else {
		embed.updateMessage();
	}

	container.logger.info(
		`User ${interactionUser?.tag}(${interactionUser?.id}) requested the history of the bot on server ${serverName}(${serverId}). Page ${page}`
	);
}

export default handleHistory;
