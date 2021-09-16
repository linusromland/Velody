//Dependencies Import
const {
  MessageEmbed
} = require("discord.js");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Shows available commands on Velody",
  callback: async ({
    interaction,
    args
  }) => {
    //Creates a messageEmbed for reply
    const embed = new MessageEmbed();
    embed.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/Velody-logos.jpeg', 'https://github.com/linusromland/Velody')
    embed.setTitle("Available Commands"); //Sets the title for the Embed
    embed.setDescription(
      `"/join" - Joins to voice channel\u200b
      "/leave" - Leaves voice channel\u200b
      "/play <song>" - Plays song from URL or search\u200b
      "/nowplaying" - Shows what is currently playing\u200b
      "/queue" - Shows queue\u200b
      "/skip" - Skips current song`
    );
    return embed;
  },
};