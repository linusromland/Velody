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
    embed.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/Velody-logos.jpeg', 'https://github.com/linusromland/Velody')
    embed.setTitle("Something went wrong!");

    embed = voice.join(embed, client, interaction);

    return embed;
  },
};