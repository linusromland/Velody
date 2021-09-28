//init of dotenv
require("dotenv").config();

//init of better-logging
require("better-logging")(console);

//Dependencies import
const DiscordJS = require("discord.js");
const WOKCommands = require("wokcommands");
const prefix = process.env.PREFIX || "!"

//Local Variables
const guildId = "554977304665784325";
const client = new DiscordJS.Client({
  partials: ["MESSAGE"],
});

//When DiscordBot started, init of WOKCommands
client.on("ready", () => {

  console.info(`Logged in as ${client.user.tag}!`);
  let wok = new WOKCommands(client, {
      commandsDir: "commands",
      testServers: [guildId],
      showWarns: false,
    })
    .setDefaultPrefix(prefix)
    .setColor(0xff0000)
    .setBotOwner("400691601011113986") //sets bot owner to linusromland#7577
  console.info(`WOKCommands loaded and using prefix "${prefix}"`)
});


//Login with Discord Bot Token
client.login(process.env.TOKEN);