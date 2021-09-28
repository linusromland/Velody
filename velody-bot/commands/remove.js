//Dependencies Import
const discordJS = require("discord.js");
const embed = require("../embed.js");
const voice = require("../voice.js");

module.exports = {
    name: 'remove',
    aliases: ['rm'],
    slash: "both",
    testOnly: true,
    description: "Removes from queue at location.",
    minArgs: 1,
    expectedArgs: "<remove>",
    callback: async ({
        interaction,
        message,
        client,
        args
    }) => {
        let messageObject;

        if (message) messageObject = await message.channel.send(embed.loading())


        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)
        let removeIndex = args[0]
        if (message) removeIndex = args.join(" ");
        let remove = await voice.remove(removeIndex);
        switch (remove.statusCode) {
            case 200:
                msgEmbed.setTitle(`Removed **${remove.title}** from queue`)
                break;
            case 201:
                msgEmbed.setTitle(`Nothing at that location in the queue!`)
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }

        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};