//init of dotenv
require("dotenv").config();

let voiceChannel;
let voiceConnection;

const ytdl = require('ytdl-core');
const ytsearch = require('youtube-search');
const validUrl = require('valid-url');

var opts = {
    maxResults: 10,
    key: process.env.YOUTUBE_KEY,
};

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
            voiceConnection = connection;
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

exports.leave = async (embed) => {
    embed.setTitle("Something went wrong!");
    embed.setDescription("Please add issue to GitHub repo if this continues!")
    let name = voiceChannel ? voiceChannel.name : null;
    if (voiceChannel) {
        //Leaves voice channel
        await voiceChannel.leave()
        embed.setTitle(`Disconnected from *${name}*`);
        embed.setDescription(`Use command "/join" to connect me to a voice channel again!`)
        voiceChannel = null;
    } else {
        embed.setTitle(`I'm not connected to a voice channel!`);
        embed.setDescription(`Use command "/join" to connect me to a voice channel!`)
    }
    return embed;
}

exports.play = async (embed, client, interaction, search) => {
    if (!voiceChannel) await this.join(embed, client, interaction)
    let URL;

    if (validUrl.isUri(search)) {
        URL = search
    } else {
        URL = await new Promise((resolve, reject) => {
            ytsearch(search, opts, function (err, results) {
                if (err) reject(err)
                resolve(results[0].link)
            });
        })
    }

    const stream = ytdl(URL, {
        filter: "audioonly",
        type: 'opus'
    })
    const songInfo = await ytdl.getInfo(URL);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        thumbnail: songInfo.player_response.videoDetails.thumbnail.thumbnails[0].url
    };
    embed.setTitle(`Playing video *${song.title}*`)
    embed.setDescription(`URL to video: ${song.url}`)
    embed.setImage(song.thumbnail)
    const dispatcher = voiceConnection.play(stream)
    return embed
}