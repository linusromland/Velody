//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
let messageObject;

module.exports = {
    name: 'leave',
    aliases: ['l', 'dc', 'disconnect'],
    slash: "both",
    testOnly: true,
    description: "Disconnect the bot from the voice channel it is in.",
    callback: async ({
        interaction,
        client,
        message
    }) => {
        if (message) messageObject = await message.channel.send(embed.loading())

        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let leave = await voice.leave(message, client, interaction);
        switch (leave.statusCode) {
            case 200:
                msgEmbed.setTitle(`Disconnected from *${leave.name}*`);
                msgEmbed.setDescription(`Use command "/join" to connect me to a voice channel again!`)
                break;
            case 201:
                msgEmbed.setTitle(`I'm not connected to a voice channel!`);
                msgEmbed.setDescription(`Use command "/join" to connect me to a voice channel!`)
                break;
            default:
                embed.setError(msgEmbed)
                break;
        }
        if (message) messageObject.edit(msgEmbed)

        return msgEmbed;
    },
};