//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
let messageObject;

module.exports = {
    name: 'queue',
    aliases: ['q'],
    slash: "both",
    testOnly: false,
    description: "View the queue.",
    callback: async ({
        message
    }) => {
        if (message) messageObject = await message.channel.send(embed.loading())

        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let queue = await voice.queue();
        switch (queue.statusCode) {
            case 200:
                msgEmbed.setTitle(`Queue`);
                msgEmbed.setDescription(queue.description)
                break;
            case 201:
                msgEmbed.setTitle(`Queue is empty!`);
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }
        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};