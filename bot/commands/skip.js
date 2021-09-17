//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");

module.exports = {
  name: 'skip',
  aliases: ['s'],
  slash: "both",
  testOnly: false,
  description: "Skips the currently playing song.",
  callback: async ({
    message
  }) => {
    let msgEmbed = new discordJS.MessageEmbed();
    embed.setDefaults(msgEmbed)

    msgEmbed = await voice.skip(msgEmbed);

    if(message) message.reply(msgEmbed)

    return msgEmbed;
  },
};