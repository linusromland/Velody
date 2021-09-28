//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
let messageObject;


module.exports = {
    name: 'loopqueue',
    aliases: ['lq'],
    slash: "both",
    testOnly: true,
    description: "Loop the queue.",
    callback: async ({
        message
    }) => {
        if (message) messageObject = await message.channel.send(embed.loading())

        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let loop = await voice.loopqueue();
        switch (loop) {
            case 200:
                msgEmbed.setTitle(`Disabled queue loop`);
                msgEmbed.setDescription(`To renable run "/loopqueue"`)
                break;
            case 201:
                msgEmbed.setTitle(`Enabled queue loop`);
                msgEmbed.setDescription(`To disable run "/loopqueue"`)
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }
        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};