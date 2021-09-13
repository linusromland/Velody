//Dependencies Import
const { MessageEmbed } = require("discord.js");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Velody joins your voice channel!",
  callback: async ({ interaction, args }) => {
    //Creates a messageEmbed for reply
    const embed = new MessageEmbed();

    embed.setTitle("Sorry, Velody can't join voice channels yet");


    return embed;
  },
};
