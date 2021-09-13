//Dependencies Import
const { MessageEmbed } = require("discord.js");
const { findInDB } = require("./locationDB");
const { checkWeather } = require("./checkWeather");
let client;
let rainedUsers = [];
exports.runEveryFullHours = (clientIN) => {
  client = clientIN;
  const Hour = 60 * 60 * 1000;
  const currentDate = new Date();
  const firstCall =
    Hour -
    (currentDate.getMinutes() * 60 + currentDate.getSeconds()) * 1000 -
    currentDate.getMilliseconds();
  setTimeout(() => {
    this.sendMessages();
    setInterval(this.sendMessages, Hour);
  }, firstCall);
};

exports.sendMessages = async () => {
  const channel = client.channels.cache.get(process.env.CHANNEL);
  let users = await findInDB();
  users.forEach(async (element) => {
    if (element.loc != "none") {
      let rain = await checkWeather(element.loc).rain;

      if (rain && !rainedUsers.includes(element.id)) {
        rainedUsers.push(element.id);
        //Creates a messageEmbed for reply
        const embed = new MessageEmbed().setTitle(
          `It will rain in the next hour in ${element.loc}`
        ).setDescription("Data from SMHI")
        channel.send(`<@${element.id}>`)
        channel.send(embed);
      } else if (rainedUsers.includes(element.id)) {
        console.log("Already rained");

        if (!rain) {
          let index = rainedUsers.indexOf(element.id);
          rainedUsers.splice(index, 1);
          console.log("Removed");
        }
      }
    }
  });

  console.log("Sent messages at " + new Date());
};
