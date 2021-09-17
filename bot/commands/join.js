//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");
let messageObject;

module.exports = {
  name: 'join',
  aliases: ['connect', 'j'],
  slash: "both",
  testOnly: true,
  description: "Summons the bot to your voice channel.",
  callback: async ({
    interaction,
    client,
    message
  }) => {
    if (message) messageObject = await message.channel.send(embed.loading())

    let msgEmbed = new discordJS.MessageEmbed();
    embed.setDefaults(msgEmbed)

    let join = await voice.join(message, client, interaction);
    switch (join.statusCode) {
      case 200:
        msgEmbed.setTitle(`Joined voice channel *${join.voiceChannel.name}*`)
        msgEmbed.setDescription(`Use command "/help" to get a list of commands`)
        break;
      case 201:
        msgEmbed.setTitle("Please join a voice channel first!");
        break;
      default:
        embed.setError(msgEmbed)
        break;
    }
    if (message) messageObject.edit(msgEmbed)

    return msgEmbed;
  },
};