const discordJS = require("discord.js");

exports.setDefaults = (message) => {
    message.setAuthor('Velody', 'https://raw.githubusercontent.com/linusromland/Velody/master/assets/logo.jpeg', 'https://github.com/linusromland/Velody')
}

exports.setError = (message) => {
    message.setTitle("Something went wrong!");
    message.setDescription("If the issue persists, please add an issue to GitHub!")
    message.setURL("https://github.com/linusromland/Velody/issues/new")
}

exports.loading = () => {
    let msgEmbed = new discordJS.MessageEmbed();
    this.setDefaults(msgEmbed)
    msgEmbed.setTitle("Velody is thinking...")
    return msgEmbed;
}