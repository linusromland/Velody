//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Summons the bot to your voice channel.",
  callback: async ({
    interaction,
    client, 
    message
  }) => {
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
        msgEmbed.setTitle("Something went wrong!");
        msgEmbed.setDescription("Please add issue to GitHub repo if this continues!")
        msgEmbed.setURL("https://github.com/linusromland/Velody/issues/new")
        break;
    }
    if(message) message.reply(msgEmbed)

    return msgEmbed;
  },
};