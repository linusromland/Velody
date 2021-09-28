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

exports.botReady = () => {
    let msgEmbed = new discordJS.MessageEmbed();
    this.setDefaults(msgEmbed)
    msgEmbed.setTitle("Hello! I'm ready for your commands!")
    msgEmbed.setDescription(`Don't know my commands? run "/help"`)
    return msgEmbed;
}

exports.addLoopSymbols = (msgEmbed, loops) => {
    let text = loops.loop ? "Loop: ✔️" : "Loop: ❌"
    text += loops.loopqueue ? "\nQueue loop: ✔️" : "\nQueue loop: ❌"
    msgEmbed.setFooter(text);
}