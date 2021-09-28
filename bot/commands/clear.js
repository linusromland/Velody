//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
let messageObject;

module.exports = {
    name: 'clear',
    aliases: ['c'],
    slash: "both",
    testOnly: false,
    description: "Clears the queue.",
    callback: async ({
        message
    }) => {
        if (message) messageObject = await message.channel.send(embed.loading())

        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let clear = await voice.clear();
        switch (clear.statusCode) {
            case 200:
                msgEmbed.setTitle(`Queue cleared`);
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }
        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};