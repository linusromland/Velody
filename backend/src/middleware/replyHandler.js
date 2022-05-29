exports.reply = (reply, message, interaction) => {
    if (message) {
        message.reply(reply);
        return;
    }

    interaction.reply(reply);
};
