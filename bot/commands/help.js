//Dependencies Import
const { MessageEmbed } = require("discord.js");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Shows available commands on Velody",
  callback: async ({ interaction, args }) => {
    //Creates a messageEmbed for reply
    const embed = new MessageEmbed();

    embed.setTitle("Available Commands - Velody"); //Sets the title for the Embed
    embed.setDescription(
      `Coming soon!`
    );

    return embed;
  },
};
