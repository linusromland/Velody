//Dependencies Import
const {
    MessageEmbed
} = require("discord.js");
const voice = require("../voice.js");

module.exports = {
    slash: "both",
    testOnly: true,
    description: "Disconnect the bot from the voice channel it is in.",
    callback: async ({
        interaction,
        client
    }) => {
        let embed = new MessageEmbed();
        embed.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/Velody-logos.jpeg', 'https://github.com/linusromland/Velody')
        embed.setTitle("Something went wrong!");

        embed = voice.leave(embed);

        return embed;
    },
};