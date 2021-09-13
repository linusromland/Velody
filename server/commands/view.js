//Dependencies Import
const { MessageEmbed } = require("discord.js");

//Local Dependencies Import
const locationDB = require("../locationDB.js");
const User = require("../Models/User");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Shows your currently set location on discord-weather",
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
        embed.setTitle(`Your location is set to "${exisitingUser.loc}"`); //Sets the title for the Embed
        embed.setDescription(`You can change your location with the command "/setLocation your_location"`)
      }

    return embed;
  },
};
