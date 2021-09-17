//Dependencies Import
const {
    MessageEmbed
} = require("discord.js");
const voice = require("../voice.js");

module.exports = {
    name: 'nowplaying', 
    aliases: ['np'],
    slash: "both",
    testOnly: true,
    description: "Shows currently playing song - Velody",
    callback: async ({
        interaction,
        client,
        args
    }) => {
        let embed = new MessageEmbed();
        embed.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/Velody-logos.jpeg', 'https://github.com/linusromland/Velody')
        embed = voice.nowplaying(embed);
        return embed;
    },
};