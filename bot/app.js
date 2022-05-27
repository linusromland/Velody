//init of dotenv
require("dotenv").config();

//init of better-logging
require('better-logging')(console);

//Dependencies import
const DiscordJS = require('discord.js');
const WOKCommands = require('wokcommands');
const prefix = process.env.PREFIX || '!';
const embed = require('./embed');

//Local Variables
const guildId = '554977304665784325';
const client = new DiscordJS.Client({
	partials: ['MESSAGE']
});

//When DiscordBot started, init of WOKCommands
client.on('ready', () => {
	console.info(`Logged in as ${client.user.tag}!`);
	new WOKCommands(client, {
		commandsDir: 'commands',
		testServers: [guildId],
		showWarns: false
	})
		.setDefaultPrefix(prefix)
		.setColor(0xff0000)
		.setBotOwner(process.env.BOT_OWNER); //sets bot owner to linusromland#7577
	console.info(`WOKCommands loaded and using prefix "${prefix}"`);
	client.channels.cache.get(process.env.CHANNEL_ID).send(embed.botReady());
});

//Login with Discord Bot Token
client.login(process.env.TOKEN);
