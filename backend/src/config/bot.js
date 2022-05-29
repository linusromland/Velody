exports.botStartup = () => {
    //External dependencies:
    const DiscordJS = require('discord.js');
    const WOKCommands = require('wokcommands');
    const path = require('path');

    const { Intents } = DiscordJS;

    const client = new DiscordJS.Client({
        intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
    });

    client.on('ready', () => {
        new WOKCommands(client, {
            commandsDir: path.join(__dirname, '../commands'),
            testServers: ['554977304665784325'],
        }).setDefaultPrefix(process.env.DISCORD_BOT_PREFIX || '!');
    });

    client.login(process.env.DISCORD_BOT_TOKEN);
};
