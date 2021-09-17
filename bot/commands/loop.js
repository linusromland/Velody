//Dependencies Import
const discordJS = require("discord.js");
const voice = require("../voice.js");
const embed = require("../embed.js");


module.exports = {
    slash: "both",
    testOnly: true,
    description: "Loop the currently playing song.",
    callback: async ({
        message
    }) => {
        let msgEmbed = new discordJS.MessageEmbed();
        embed.setDefaults(msgEmbed)

        let loop = await voice.loop();
        switch (loop) {
            case 200:
                msgEmbed.setTitle(`Disabled loop`);
                msgEmbed.setDescription(`To renable run "/loop"`)
                break;
            case 201:
                msgEmbed.setTitle(`Enabled loop`);
                msgEmbed.setDescription(`To disable run "/loop"`)
                break;
            default:
                msgEmbed.setTitle("Something went wrong!");
                msgEmbed.setDescription("Please add issue to GitHub repo if this continues!")
                msgEmbed.setURL("https://github.com/linusromland/Velody/issues/new")
                break;
        }
        if (message) message.reply(msgEmbed)

        return msgEmbed;
    },
};