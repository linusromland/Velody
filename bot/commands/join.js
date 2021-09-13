//Dependencies Import
const {
  MessageEmbed
} = require("discord.js");
const voice = require("../voice.js");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Velody joins your voice channel!",
  callback: async ({
    interaction,
    client
  }) => {
    let embed = new MessageEmbed();
    embed.setTitle("Something went wrong!");

    embed = voice.join(embed, client, interaction);

    return embed;
  },
};