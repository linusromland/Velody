//Dependencies Import
const discordJS = require("discord.js");
const embed = require("../embed.js");
let messageObject;

module.exports = {
  name: 'help',
  aliases: ['h'],
  slash: "both",
  testOnly: true,
  description: "Shows available commands on Velody",
  callback: async ({
    message,
    client
  }) => {
    if (message) messageObject = await message.channel.send(embed.loading())

    let msgEmbed = new discordJS.MessageEmbed();
    embed.setDefaults(msgEmbed)

    msgEmbed.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/Velody-logos.jpeg', 'https://github.com/linusromland/Velody')
    msgEmbed.setTitle("Available Commands"); //Sets the title for the Embed
    msgEmbed.setDescription(
      `"/play <song>" - Plays a song with the given name or URL.\u200b
      "/playskip <song>" - Adds a song to the top of the queue then skips to it.\u200b
      "/join" - Summons the bot to your voice channel.\u200b
      "/leave" - Disconnect the bot from the voice channel it is in.\u200b
      "/nowplaying" - Shows what song the bot is currently playing.\u200b
      "/skip" - Skips the currently playing song.\u200b
      "/loop" - Loop the currently playing song.\u200b
      "/loopqueue" - Loop the queue\u200b
      "/queue" - View the queue\u200b
      "/clear" - Clears the queue\u200b
      "/remove" - Removes from queue at location\u200b
      "/shuffle" - Shuffles the queue\u200b`
    );
    if (message) messageObject.edit(msgEmbed)
    return msgEmbed;
  },
};