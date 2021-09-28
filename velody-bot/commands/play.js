//Dependencies Import
const discordJS = require("discord.js");
const embed = require("../embed.js");
const voice = require("../voice.js");

module.exports = {
    name: 'play',
    aliases: ['p'],
    slash: "both",
    testOnly: true,
    description: "Plays a song with the given name or URL.",
    minArgs: 1,
    expectedArgs: "<song>",
    callback: async ({
        interaction,
        message,
        client,
        args
    }) => {
        let messageObject;

        if (message) messageObject = await message.channel.send(embed.loading())

        await voice.join(message, client, interaction)

        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)
        let search = args[0]
        if (message) search = args.join(" ");
        let play = await voice.play(client, interaction, search, message);
        switch (play.statusCode) {
            case 200:
                msgEmbed.setTitle(`Playing **${play.song.title}**`)
                msgEmbed.setURL(play.song.url)
                msgEmbed.setImage(play.song.thumbnail)
                break;
            case 201:
                msgEmbed.setTitle(`Added **${play.song.title}** to queue!`)
                msgEmbed.setURL(play.song.url)
                msgEmbed.setImage(play.song.thumbnail)
                break;
            case 300:
                msgEmbed.setTitle(`Added playlist **${play.song.playlist.title}**`)
                msgEmbed.setURL(play.song.playlist.url)
                msgEmbed.setImage(play.song.playlist.bestThumbnail.url)
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