//Dependencies Import
const { MessageEmbed } = require("discord.js");

//Local Dependencies Import
const locationDB = require("../locationDB.js");
const User = require("../Models/User");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Deletes your location from discord-weather",
  callback: async ({ interaction, args }) => {
    //Creates a messageEmbed for reply
    const embed = new MessageEmbed();

    //Gets id of the author of command
    const userID = await interaction.member.user.id;

    //Checks if the user is in Mongo
    let exisitingUser = await locationDB.findUserWithID(userID);

    if (!exisitingUser) {
      embed.setTitle("You don't have any location set currently!"); //Sets the title for the Embed
      embed.setDescription(`You can set a location with the command "/setLocation your_location"`)
    } else {
      exisitingUser.remove()
        embed.setTitle(`Your location is now removed!`); //Sets the title for the Embed
        embed.setDescription(`You can add your location again with the command "/setLocation your_location"`)
      }

    return embed;
  },
};
