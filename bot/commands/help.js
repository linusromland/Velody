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
      `"/play <song>" - Plays a song with the given name or URL.\u200b
      "/playskip <song>" - Adds a song to the top of the queue then skips to it.\u200b
      "/join" - Summons the bot to your voice channel.\u200b
      "/leave" - Disconnect the bot from the voice channel it is in.\u200b
      "/nowplaying" - Shows what song the bot is currently playing.\u200b
      "/skip" - Skips the currently playing song.\u200b
      "/loop" - Loop the currently playing song.\u200b
      "/queue" - View the queue`
    );
    return embed;
  },
};