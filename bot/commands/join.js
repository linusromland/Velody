//Dependencies Import
const {
  MessageEmbed
} = require("discord.js");

module.exports = {
  slash: "both",
  testOnly: true,
  description: "Velody joins your voice channel!",
  callback: async ({
    interaction,
    client
  }) => {
    const embed = new MessageEmbed();

    console.log(client.voice)

    const Guild = await client.guilds.cache.get(interaction.guild_id);
    const Member = await Guild.members.cache.get(interaction.member.user.id);
    if(await Member.voice.channel){
      await Member.voice.channel.join().then(connection => {
        embed.setTitle("Joined voice channel 👍🏻")
        embed.setDescription(`Use command "/help" to get a list of commands`)
      }).catch(error => {
        embed.setTitle("Something went wrong!");
        embed.setDescription("Please add issue to GitHub repo if this continues!")
        })
    }else{
      embed.setTitle("Please join a voice channel first!");
    }
    return embed;
    

  },
};