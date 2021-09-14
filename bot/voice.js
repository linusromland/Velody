//init of dotenv
require("dotenv").config();

let voiceChannel;
let voiceConnection;
let dispatcher;
let queue = [];
let playingMusic = false;

const ytdl = require('ytdl-core');
const ytsearch = require('youtube-search');
const validUrl = require('valid-url');

let opts = {
    maxResults: 10,
    key: process.env.YOUTUBE_KEY,
};

exports.join = async (embed, client, interaction) => {

    //Gets Member varaible from ID. 
    const Guild = await client.guilds.cache.get(interaction.guild_id);
    const Member = await Guild.members.cache.get(interaction.member.user.id);


    if (await Member && await Member.voice.channel) {
        voiceChannel = await Member.voice.channel
        //Joins voice channel
        await voiceChannel.join().then(connection => {
            connection.voice.setSelfDeaf(true);
            voiceConnection = connection;
            embed.setTitle(`Joined voice channel *${voiceChannel.name}*`)
            embed.setDescription(`Use command "/help" to get a list of commands`)
        }).catch(error => {
            embed.setTitle("Something went wrong!");
            embed.setDescription("Please add issue to GitHub repo if this continues!")
            embed.setURL("https://github.com/linusromland/Velody/issues/new")
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
    try {
        let URL;

        if (validUrl.isUri(search)) {
            URL = search
        } else {
            let searchResults = await new Promise((resolve, reject) => {
                ytsearch(search, opts, function (err, results) {
                    if (err) reject(err)
                    resolve(results)
                });
            })
            URL = searchResults[0].link
        }

        const songInfo = await ytdl.getInfo(URL);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            thumbnail: songInfo.player_response.videoDetails.thumbnail.thumbnails[0].url,
            length: songInfo.videoDetails.lengthSeconds
        };
        queue.push(song);
        if (playingMusic) {
            embed.setTitle(`Added *${song.title}* to queue!`)
            embed.setDescription("")
            embed.setURL(song.url)
            embed.setImage(song.thumbnail)

        } else {
            embed.setTitle(`Playing *${song.title}*`)
            embed.setDescription("")
            embed.setURL(song.url)
            embed.setImage(song.thumbnail)
            startPlay(embed, client, interaction)
        }
        return embed
    } catch (error) {
        embed.setTitle("Didn't find a video with that name/URL!");
        embed.setDescription("Try searching for something else")
        return embed
    }

}

exports.skip = async (embed) => {
    if (queue.length > 0) {
        embed.setTitle(`Skipped song *${queue[0].title}*`);
        if (queue[1]) embed.setDescription(`Song coming up: *${queue[1].title}*`);
        dispatcher.end();
    } else {
        embed.setTitle(`No song is currently playing!`);
        embed.setDescription(`Use command "/play <song>" to play a song`)
    }

    return embed;
}

exports.nowplaying = (embed) => {
    if (queue.length > 0) {
        embed.setTitle(`Playing *${queue[0].title}*`)
        embed.setDescription(`${dispatcher.streamTime / 1000}s / ${queue[0].length}s`)
        embed.setURL(queue[0].url)
        embed.setImage(queue[0].thumbnail)
    } else {
        embed.setTitle(`No song is currently playing!`);
        embed.setDescription(`Use command "/play <song>" to play a song`)
    }

    return embed;
}

startPlay = async (embed, client, interaction) => {
    do {
        await playMusic(embed, client, interaction)
    } while (queue.length > 0);
    voiceChannel.leave();
}

playMusic = async (embed, client, interaction) => {
    if (!voiceChannel || client.voice.connections.size <= 0) await this.join(embed, client, interaction)
    return new Promise((resolve, reject) => {
        const stream = ytdl(queue[0].url, {
            filter: "audioonly",
            type: 'opus'
        })
        dispatcher = voiceConnection.play(stream)
            .on("finish", () => {
                queue.shift()
                playingMusic = false;
                resolve()
            })
            .on("error", error => reject(error));
        playingMusic = true;
    })
}