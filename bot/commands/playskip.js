//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");

module.exports = {
    name: 'playskip',
    aliases: ['ps'],
    slash: "both",
    testOnly: true,
    description: "Adds a song to the top of the queue then skips to it.",
    minArgs: 1,
    expectedArgs: "<song>",
    callback: async ({
        interaction,
        client,
        args,
        message
    }) => {
        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)
        msgEmbed = await voice.playskip(msgEmbed, client, interaction, message, args[0]);

        if(message) message.reply(msgEmbed)

        return msgEmbed;
    },
};