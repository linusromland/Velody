//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
let messageObject;


module.exports = {
    name: 'shuffle',
    slash: "both",
    testOnly: true,
    description: "Shuffles queue.",
    callback: async ({
        message
    }) => {
        if (message) messageObject = await message.channel.send(embed.loading())

        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let shuffle = await voice.shuffle();
        switch (shuffle) {
            case 200:
                msgEmbed.setTitle(`Shuffled queue!`);
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }
        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};