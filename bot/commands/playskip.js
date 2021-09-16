//Dependencies Import
const {
    MessageEmbed
} = require("discord.js");
const voice = require("../voice.js");

module.exports = {
    slash: "both",
    testOnly: true,
    description: "Play audio from youtube URL - Velody",
    minArgs: 1,
    expectedArgs: "<song>",
    callback: async ({
        interaction,
        client,
        args
    }) => {
        let embed = new MessageEmbed();
        embed.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/Velody-logos.jpeg', 'https://github.com/linusromland/Velody')
        embed = voice.playskip(embed, client, interaction, args[0]);
        return embed;
    },
};