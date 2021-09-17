//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");

module.exports = {
    slash: "both",
    testOnly: false,
    description: "View the queue.",
    aliases: ['q'],
    callback: async ({
        message
    }) => {
        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let queue = await voice.leave();
        switch (queue.statusCode) {
            case 200:
                msgEmbed.setTitle(`Queue`);
                msgEmbed.setDescription(queue.description)
                break;
            case 201:
                msgEmbed.setTitle(`Queue is empty!`);
                break;
            default:
                msgEmbed.setTitle("Something went wrong!");
                msgEmbed.setDescription("Please add issue to GitHub repo if this continues!")
                msgEmbed.setURL("https://github.com/linusromland/Velody/issues/new")
                break;
        }
        if (message) message.reply(msgEmbed)

        return msgEmbed;
    },
};