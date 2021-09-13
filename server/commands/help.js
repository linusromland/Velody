//Dependencies Import
const { MessageEmbed } = require("discord.js");

//Local Dependencies Import
const locationDB = require("../locationDB.js");
const User = require("../Models/User");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Shows available commands on discord-weather",
  callback: async ({ interaction, args }) => {
    //Creates a messageEmbed for reply
    const embed = new MessageEmbed();

    embed.setTitle("Available Commands - discord-weather"); //Sets the title for the Embed
    embed.setDescription(
      `"/setLocation your_location" - Sets your location\n
      "/deletelocation" - Deletes your location\n
      "/view" - Shows your currently set location\n
      "/weather [location]" - Gets weather at your set location or optional inserted location`
    );

    return embed;
  },
};
