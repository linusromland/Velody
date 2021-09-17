//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");


module.exports = {
    name: 'loop',
    aliases: ['l'],
    slash: "both",
    testOnly: true,
    description: "Loop the currently playing song.",
    callback: async ({
        message
    }) => {
        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let loop = await voice.loop();
        switch (loop) {
            case 200:
                msgEmbed.setTitle(`Disabled loop`);
                msgEmbed.setDescription(`To renable run "/loop"`)
                break;
            case 201:
                msgEmbed.setTitle(`Enabled loop`);
                msgEmbed.setDescription(`To disable run "/loop"`)
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }
        if (message) message.reply(msgEmbed)

        return msgEmbed;
    },
};