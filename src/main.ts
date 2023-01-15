// External dependencies
import '@sapphire/plugin-logger/register';
import { SapphireClient, container } from '@sapphire/framework';
import { VoiceState } from 'discord.js';
import fs from 'fs';

// Internal dependencies
import { BOT_TOKEN } from './utils/env';
import servers from './utils/servers';

const client: SapphireClient<boolean> = new SapphireClient({
	intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_VOICE_STATES']
});

//Log contents of the account directory
fs.readdir('./account', (err: any, files: any) => {
	if (err) {
		container.logger.error(err);
	} else {
		container.logger.info(`Account directory contents: ${files}`);
	}
});

client.login(BOT_TOKEN);

client.on('ready', () => {
	container.logger.info(`Connected as ${client.user?.tag}`);
});

//On bot being kicked from voice channel
client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
	if (oldState.channel && !newState.channel) {
		servers.remove(oldState.guild.id);
		container.logger.info(
			`Bot was kicked from voice channel ${oldState.channel.name}(${oldState.channel.id}) on server ${oldState.guild.name}(${oldState.guild.id})`
		);
	}
});

function shutdown() {
	client.destroy();
	process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
