// External dependencies
import '@sapphire/plugin-logger/register';
import { SapphireClient, container } from '@sapphire/framework';

// Internal dependencies
import { BOT_TOKEN } from './utils/env';

const client: SapphireClient<boolean> = new SapphireClient({
	intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_VOICE_STATES']
});

client.login(BOT_TOKEN);

client.on('ready', () => {
	container.logger.info(`Connected as ${client.user?.tag}`);
});

function shutdown() {
	client.destroy();
	process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
