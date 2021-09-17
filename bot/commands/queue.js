//Dependencies Import
const {
    MessageEmbed
} = require("discord.js");
const voice = require("../voice.js");

module.exports = {
    slash: "both",
    testOnly: false,
    description: "View the queue.",
    aliases: ['q'],
    callback: async ({
        interaction,
        client,
        args
    }) => {
        let embed = new MessageEmbed();
        embed.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/Velody-logos.jpeg', 'https://github.com/linusromland/Velody')
        embed = voice.queue(embed);
        return embed;
    },
};