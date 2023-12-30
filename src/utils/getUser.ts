import { Command } from '@sapphire/framework';
import { GuildMember } from 'discord.js';

function getUser(interaction: Command.ChatInputCommandInteraction): string {
	const tag = interaction.user.tag?.split('#')[0];
	const nickname = (interaction.member as GuildMember)?.nickname;

	if (!nickname) return tag;
	if (!tag) return nickname;

	return `${nickname} (${tag})`;
}

export default getUser;
