//init of dotenv
require("dotenv").config();

let voiceChannel;
let voiceConnection;
let dispatcher;
let queue = [];
let playingMusic = false;

const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const validUrl = require('valid-url');
const progressbar = require('string-progressbar');

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
            connection.on("disconnect", () => {
                this.clearAll();
            });
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
        this.clearAll();
        embed.setTitle(`Disconnected from *${name}*`);
        embed.setDescription(`Use command "/join" to connect me to a voice channel again!`)
    } else {
        embed.setTitle(`I'm not connected to a voice channel!`);
        embed.setDescription(`Use command "/join" to connect me to a voice channel!`)
    }
    return embed;
}

exports.play = async (embed, client, interaction, search) => {
    try {
        let searchResults = await ytsr(search)
        let URL = searchResults.items[0].url

        console.log(searchResults.items)

        const songInfo = await ytdl.getInfo(URL);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            thumbnail: songInfo.player_response.videoDetails.thumbnail.thumbnails[0].url,
            length: songInfo.videoDetails.lengthSeconds,
            nick: interaction.member.nick,
            username: `${interaction.member.user.username}#${interaction.member.user.discriminator}`,
            seek: 0
        };
        queue.push(song);
        if (playingMusic) {
            embed.setTitle(`Added **${song.title}** to queue!`)
            embed.setDescription("")
            embed.setURL(song.url)
            embed.setImage(song.thumbnail)

        } else {
            embed.setTitle(`Playing **${song.title}**`)
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
        embed.setTitle(`Skipped song **${queue[0].title}**`);
        if (queue[1]) embed.setDescription(`Song coming up: **${queue[1].title}**`);
        dispatcher.end();
    } else {
        embed.setTitle(`No song is currently playing!`);
        embed.setDescription(`Use command "/play <song>" to play a song`)
    }

    return embed;
}

exports.nowplaying = (embed) => {
    if (queue.length > 0) {
        embed.setTitle(`Playing **${queue[0].title}**`)
        let duration = progressbar.splitBar(queue[0].length * 1000, dispatcher.streamTime, 20);
        embed.setDescription(`${duration[0]}\n
        ${new Date(dispatcher.streamTime).toISOString().substr(14, 5)} / ${new Date(queue[0].length * 1000).toISOString().substr(14, 5)}
        \n` + "``Requested by:`` " + `${queue[0].nick} (${queue[0].username})`)
        embed.setURL(queue[0].url)
        embed.setThumbnail(queue[0].thumbnail)
    } else {
        embed.setTitle(`No song is currently playing!`);
        embed.setDescription(`Use command "/play <song>" to play a song`)
    }

    return embed;
}

exports.queue = (embed) => {
    embed.setTitle("Queue")
    let description = `__Now Playing:__
    [${queue[0].title}](${queue[0].url}) - ${new Date(queue[0].length * 1000).toISOString().substr(14, 5)}
    \n`
    if (queue.length > 1) description += "__Up next:__\n"
    for (let i = 1; i < queue.length; i++) {
        const element = queue[i];
        description += "``" + i + ".``" + ` [${element.title}](${element.url}) - ${new Date(element.length * 1000).toISOString().substr(14, 5)}\n
        `
    }
    embed.setDescription(description)
    return embed;
}

exports.clearAll = async () => {
    //Leaves voice channel
    if(voiceChannel) await voiceChannel.leave()
    if(dispatcher) await dispatcher.destroy();
    dispatcher = null;
    voiceChannel = null;
    queue = [];
    playingMusic = false;
    console.log(queue);
}

startPlay = async (embed, client, interaction) => {
    do {
        await playMusic(embed, client, interaction)
    } while (queue.length > 0);
    voiceChannel.leave();
}

playMusic = async (embed, client, interaction) => {
    if (!voiceChannel || client.voice.connections.size <= 0) await this.join(embed, client, interaction)
    return new Promise(async (resolve, reject) => {
        const stream = ytdl(queue[0].url, {
            filter: "audioonly",
            type: 'opus',
        })
        const streamOptions = {
            seek: queue[0].seek / 1000
        };
        dispatcher = voiceConnection.play(stream, streamOptions)
            .on("finish", () => {
                queue.shift()
                playingMusic = false;
                resolve()
            })
            .on("error", error => {
                queue[0].seek = dispatcher.streamTime
                console.log("Crash")
                resolve()
            });
        playingMusic = true;
    })
}