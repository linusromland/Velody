//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
const progressbar = require('string-progressbar');

module.exports = {
    name: 'nowplaying',
    aliases: ['np'],
    slash: "both",
    testOnly: true,
    description: "Shows currently playing song - Velody",
    callback: async ({
        message
    }) => {
        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let object = await voice.nowplaying();
        switch (object.statusCode) {
            case 200:
                msgEmbed.setTitle(`Playing **${object.info.title}**`)
                let duration = progressbar.splitBar(object.info.length * 1000, object.info.dispatcherStreamTime, 20);
                msgEmbed.setDescription(`${duration[0]}\n
        ${new Date(object.info.dispatcherStreamTime).toISOString().substr(14, 5)} / ${new Date(object.info.length * 1000).toISOString().substr(14, 5)}
        \n` + "``Requested by:`` " + `${object.info.nick} (${object.info.username})`)
        msgEmbed.setURL(object.info.url)
                msgEmbed.setThumbnail(object.info.thumbnail)
                break;
            case 201:
                msgEmbed.setTitle(`No song is currently playing!`);
                msgEmbed.setDescription(`Use command "/play <song>" to play a song`)
                break;
            default:
                msgEmbed.setTitle("Something went wrong!");
                msgEmbed.setDescription("Please add issue to GitHub repo if this continues!")
                msgEmbed.setURL("https://github.com/linusromland/Velody/issues/new")
                break;
        }
        if (message) message.reply(msgEmbed)

        return msgEmbed;
    },
};