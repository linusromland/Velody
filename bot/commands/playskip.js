//Dependencies Import
const {
    MessageEmbed
} = require("discord.js");
const voice = require("../voice.js");

module.exports = {
    slash: "both",
    testOnly: true,
    description: "Adds a song to the top of the queue then skips to it.",
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