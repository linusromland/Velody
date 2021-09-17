//Dependencies Import
const Message = require('../Message.js')
const voice = require("../voice.js");

module.exports = {
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
        let embed = Message;
        let search = message ? message : args[0]
        let play = await voice.play(client, interaction, search);
        console.log(play);
        switch (play.statusCode) {
            case 200:
                embed.setTitle(`Playing **${play.song.title}**`)
                embed.setURL(play.song.url)
                embed.setImage(play.song.thumbnail)
                break;
            case 201:
                embed.setTitle(`Added **${play.song.title}** to queue!`)
                embed.setURL(play.song.url)
                embed.setImage(play.song.thumbnail)
                break;
            case 404:
                embed.setTitle("Didn't find a video with that name/URL!");
                embed.setDescription("Try searching for something else")
                break;
            default:
                embed.setTitle("Unknown error!")
                embed.setDescription("If the error persists please add an issue on GitHub!")
                break;
        }

        if (message) message.reply(embed)

        return embed;
    },
};