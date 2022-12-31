// External dependencies
import { SapphireClient } from '@sapphire/framework';
import { BOT_TOKEN } from './utils/env';

const client: SapphireClient<boolean> = new SapphireClient({
	intents: ['GUILDS', 'GUILD_MESSAGES']
});

client.login(BOT_TOKEN);

function shutdown() {
	client.destroy();
	process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
