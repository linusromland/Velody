//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");

module.exports = {
    name: 'playtop',
    aliases: ['pt'],
    slash: "both",
    testOnly: true,
    description: "Adds a song to the top of the queue.",
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
        let search = args[0]

        await voice.join(message, client, interaction)

        let playtop = await voice.playtop(client, interaction, search, message);
        switch (playtop.statusCode) {
            case 200:
                msgEmbed.setTitle(`Added **${playtop.song.title}** to top of queue!`)
                msgEmbed.setURL(playtop.song.url)
                msgEmbed.setImage(playtop.song.thumbnail)
                break;
            case 404:
                msgEmbed.setTitle("Didn't find a video with that name/URL!");
                msgEmbed.setDescription("Try searching for something else")
                break;
            case 323:
                msgEmbed.setTitle("Playlist is not allowed with playtop!");
                msgEmbed.setDescription(`Please use command "/play <song/playlist>" instead!`)
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }

        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};