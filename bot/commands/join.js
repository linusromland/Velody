//Dependencies Import
const {
    MessageEmbed
} = require("discord.js");
const {
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus
} = require('@discordjs/voice');

module.exports = {
    slash: "both",
    testOnly: true,
    description: "Make Velody join you voice channel",
    callback: async ({
        channel,
        args
    }) => {
        //Creates a messageEmbed for reply
        const embed = new MessageEmbed();

        embed.setTitle("Available Commands - Velody");
        connectToChannel(channel)

        return embed;
    },
};