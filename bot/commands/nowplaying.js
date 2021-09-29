//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
const progressbar = require('string-progressbar');
let messageObject;

module.exports = {
    name: 'nowplaying',
    aliases: ['np'],
    slash: "both",
    testOnly: true,
    description: "Shows currently playing song - Velody",
    callback: async ({
        message
    }) => {
        if (message) messageObject = await message.channel.send(embed.loading())

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
                let loops = await voice.getLoops();
                embed.addLoopSymbols(msgEmbed, loops)
                break;
            case 201:
                msgEmbed.setTitle(`No song is currently playing!`);
                msgEmbed.setDescription(`Use command "/play <song>" to play a song`)
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }
        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};