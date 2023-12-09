// External dependencies
import '@sapphire/plugin-logger/register';
import { SapphireClient, container } from '@sapphire/framework';
import { VoiceState, GatewayIntentBits } from 'discord.js';

// Internal dependencies
import { BOT_TOKEN } from './utils/env';
import servers from './utils/servers';

const client: SapphireClient<boolean> = new SapphireClient({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates]
});

client.login(BOT_TOKEN);

client.on('ready', () => {
	container.logger.info(`Connected as ${client.user?.tag}`);
});

//On bot being kicked from voice channel
client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
	if (oldState.member?.user.id === client.user?.id && newState.channel === null) {
		servers.remove(oldState.guild.id);
		container.logger.info(
			`Bot was kicked from voice channel ${oldState.channel?.name}(${oldState.channelId}) on server ${oldState.guild.name}(${oldState.guild})`
		);
	}
});

function shutdown() {
	client.destroy();
	process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
