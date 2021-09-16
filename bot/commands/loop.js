//Dependencies Import
const {
    MessageEmbed
} = require("discord.js");
const voice = require("../voice.js");

module.exports = {
    slash: "both",
    testOnly: true,
    description: "Loop currently playing song - Velody",
    callback: async () => {
        let embed = new MessageEmbed();
        embed.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/Velody-logos.jpeg', 'https://github.com/linusromland/Velody')
        embed = voice.loop(embed);
        return embed;
    },
};