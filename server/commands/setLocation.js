//Dependencies Import
const { MessageEmbed } = require("discord.js");

//Local Dependencies Import
const locationDB = require("../locationDB.js");
const database = require("../database.js");
const User = require("../Models/User");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Sets your location for use with discord-weather",
  minArgs: 1,
  expectedArgs: "<location>",
  callback: async ({ interaction, args }) => {
    //Creates a messageEmbed for reply
    const embed = new MessageEmbed();

    //Gets id of the author of command
    const userID = await interaction.member.user.id;

    //Checks if the user is in Mongo
    let exisitingUser = await locationDB.findUserWithID(userID);

    if (!exisitingUser) {
      let user = new User({ id: userID, loc: args[0] }); //Creates a User Object
      await database.saveToDB(user); //Saves user object to MongoDB
      embed.addField("Location", args[0]); //adds location field to embed
      embed.setTitle("Your location is set!"); //Sets the desc for the Embed
    } else {
      await locationDB.updateLoc(userID, args[0]); //Updates location for old user
      embed.setTitle("Updated your location"); //sets desc for the embed
      embed.addField("New Location", args[0]); //adds location field to embed
      embed.addField("Old Location", exisitingUser.loc); //Adds old location field to embed
    }

    return embed;
  },
};
