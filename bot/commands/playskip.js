//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");

module.exports = {
    name: 'playskip',
    aliases: ['ps'],
    slash: "both",
    testOnly: true,
    description: "Adds a song to the top of the queue then skips to it.",
    minArgs: 1,
    expectedArgs: "<song>",
    callback: async ({
        interaction,
        client,
        args,
        message
    }) => {
        if (message) messageObject = await message.channel.send(embed.loading())

        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let playskip = await voice.playskip();

        switch (playskip.statusCode) {
            case 200:
                msgEmbed.setTitle(`Playing **${playskip.song.title}** now!`)
                msgEmbed.setURL(playskip.song.url)
                msgEmbed.setImage(playskip.song.thumbnail)
                break;
            case 404:
                msgEmbed.setTitle("Didn't find a video with that name/URL!");
                msgEmbed.setDescription("Try searching for something else")
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }

        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};