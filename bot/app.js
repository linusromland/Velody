//init of dotenv
require("dotenv").config();

//init of better-logging
require("better-logging")(console);

//Dependencies import
const DiscordJS = require("discord.js");
const WOKCommands = require("wokcommands");


//Local Variables
const guildId = "554977304665784325";
const client = new DiscordJS.Client({
  partials: ["MESSAGE"],
});

//When DiscordBot started, init of WOKCommands
client.on("ready", () => {

  console.info(`Logged in as ${client.user.tag}!`);
  new WOKCommands(client, {
    commandsDir: "commands",
    testServers: [guildId],
    showWarns: false,
  });
});


//Login with Discord Bot Token
client.login(process.env.TOKEN);