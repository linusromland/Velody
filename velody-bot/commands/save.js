//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
const progressbar = require('string-progressbar');
let messageObject;

module.exports = {
    name: 'save',
    aliases: ['yoink'],
    slash: "both",
    testOnly: true,
    description: "Saves currently playing song to DM - Velody",
    callback: async ({
        message, interaction, client
    }) => {

        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)
        let error = false;

        let object = await voice.nowplaying();
        switch (object.statusCode) {
            case 200:
                msgEmbed.setTitle(`Song saved!`)
                msgEmbed.setDescription(`**${object.info.title}**\n${object.info.url}`)
                msgEmbed.setThumbnail(object.info.thumbnail)
                break;
            case 201:
                msgEmbed.setTitle("Nothing is playing!")
                error = true;
            default:
                embed.setError(msgEmbed)
                error = true;
                break;
        }

        if(!error){
            if(message){
                message.author.send(msgEmbed)
            }else{
                const user = client.users.cache.get(interaction.member.user.id);
                user.send(msgEmbed)

            }
        }else{
            if(message) message.reply(msgEmbed)
        }

        let messageEmbed = new discordJS.MessageEmbed();
        if(!message){
            embed.setDefaults(messageEmbed)
            messageEmbed.setTitle("Saved! Check your DM!")
        }

        return messageEmbed;
    },
};