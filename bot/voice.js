let voiceChannel;

exports.join = async (embed, client, interaction) => {

    //Checks if bot is in any voice channel
    if (voiceChannel) {
        embed.setTitle(`I'm already in a voice channel!`)
        return embed;
    }

    //Gets Member varaible from ID. 
    const Guild = await client.guilds.cache.get(interaction.guild_id);
    const Member = await Guild.members.cache.get(interaction.member.user.id);

    if (await Member && await Member.voice.channel) {
        voiceChannel = await Member.voice.channel
        //Joins voice channel
        await voiceChannel.join().then(connection => {
            embed.setTitle(`Joined voice channel *${voiceChannel.name}*`)
            embed.setDescription(`Use command "/help" to get a list of commands`)
        }).catch(error => {
            embed.setTitle("Something went wrong!");
            embed.setDescription("Please add issue to GitHub repo if this continues!")
        })
    } else {
        embed.setTitle("Please join a voice channel first!");
    }
    return embed;
}
