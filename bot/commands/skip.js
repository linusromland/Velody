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

    let skip = await voice.skip();

    switch (skip.statusCode) {
      case 200:
        msgEmbed.setTitle(`Skipped song **${queue[0].title}**`);
        if (skip.info.upcoming) msgEmbed.setDescription(`Song coming up: **${object.info.upcoming}**`);

        break;
      case 201:
        msgEmbed.setTitle(`No song is currently playing!`);
        msgEmbed.setDescription(`Use command "/play <song>" to play a song`)
        break;
      default:
        embed.setError(msgEmbed)
        break;
    }

    if (message) message.reply(msgEmbed)

    return msgEmbed;
  },
};