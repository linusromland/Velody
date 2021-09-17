//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");

module.exports = {
    slash: "both",
    testOnly: true,
    description: "Disconnect the bot from the voice channel it is in.",
    callback: async ({
        interaction,
        client,
        message
    }) => {
        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let leave = await voice.leave(message, client, interaction);
        switch (leave.statusCode) {
            case 200:
                msgEmbed.setTitle(`Disconnected from *${leave.name}*`);
                msgEmbed.setDescription(`Use command "/join" to connect me to a voice channel again!`)
                break;
            case 201:
                msgEmbed.setTitle(`I'm not connected to a voice channel!`);
                msgEmbed.setDescription(`Use command "/join" to connect me to a voice channel!`)
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