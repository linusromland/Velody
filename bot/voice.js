//init of dotenv
require("dotenv").config();

let voiceChannel;
let voiceConnection;
let dispatcher;
let queue = [];
let loop = false;
let playingMusic = false;

const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const validUrl = require('valid-url');
const progressbar = require('string-progressbar');

let opts = {
    maxResults: 10,
    key: process.env.YOUTUBE_KEY,
};

exports.join = async (message, client, interaction) => {
    let object = {statusCode: 401};
    if (message) {
        voiceChannel = await message.member.voice.channel
    } else {
        const Guild = await client.guilds.cache.get(interaction.guild_id);
        const Member = await Guild.members.cache.get(interaction.member.user.id);
        if (await Member && await Member.voice.channel) voiceChannel = await Member.voice.channel
    }
    if (voiceChannel) {
        //Joins voice channel
        await voiceChannel.join().then(connection => {
            connection.voice.setSelfDeaf(true);
            voiceConnection = connection;
            object.voiceChannel = voiceChannel;
            connection.on("disconnect", () => {
                this.clearAll();
            });
            object.statusCode = 200
        }).catch(error => {
            statusCode = 111
        })
    } else {
        object.statusCode = 201
    }
    return object;
}

exports.leave = async () => {
    let name = voiceChannel ? voiceChannel.name : null;
    let object = {
        statusCode: 401,
        name : name
    }
    if (voiceChannel) {
        this.clearAll();
        object.statusCode = 200
    } else {
        object.statusCode = 201
    }
    return object;
}

exports.play = async (client, interaction, search, message) => {
    try {
        let song = await getSong(search, interaction, message, client)
        queue.push(song);
        let object = {
            song: song,
            statusCode: 404
        }
        if (!song) {
            object.statusCode = 404;
            return object;
        }
        if (playingMusic) {
            object.statusCode = 201;
        } else {
            object.statusCode = 200;
            startPlay(client, interaction)
        }
        return object;
    } catch (error) {
        return {
            statusCode: 400,
            error: error
        };
    }
}

exports.playskip = async (embed, client, interaction, search) => {
    if (queue.length > 0) {
        let song = await getSong(search, interaction)
        queue.splice(1, 0, song)
        this.skip()
        embed.setTitle(`Skipping and playing **${song.title}**`)
        embed.setDescription("")
        embed.setURL(song.url)
        embed.setImage(song.thumbnail)
    } else {
        embed = await this.play(embed, client, interaction, search)
    }
    return embed
}

exports.skip = async (embed) => {
    if (queue.length > 0) {
        if (embed) embed.setTitle(`Skipped song **${queue[0].title}**`);
        if (queue[1] && embed) embed.setDescription(`Song coming up: **${queue[1].title}**`);
        dispatcher.end();
    } else if (embed) {
        embed.setTitle(`No song is currently playing!`);
        embed.setDescription(`Use command "/play <song>" to play a song`)
    }

    return embed;
}

exports.loop = async () => {
    if (loop) {
        loop = false
        return 200
    } else {
        loop = true
        return 201
    }
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
    if (voiceChannel) await voiceChannel.leave()
    if (dispatcher) await dispatcher.destroy();
    dispatcher = null;
    voiceChannel = null;
    queue = [];
    playingMusic = false;
}

startPlay = async () => {
    do {
        await playMusic()
    } while (queue.length > 0);
    voiceChannel.leave();
}

playMusic = async () => {
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
                if (!loop) queue.shift()
                playingMusic = false;
                resolve()
            })
            .on("error", error => {
                queue[0].seek = dispatcher.streamTime
                console.log("Lost Connection to discord. Reconnecting...")
                resolve()
            });
        playingMusic = true;
    })
}

getSong = async (search, interaction, message, client) => {
    let searchResults = await ytsr(search, {
        limit: 1
    })
    let URL = searchResults.items[0].url

    const songInfo = await ytdl.getInfo(URL);

    let nickname = message ? message.member.nickname : interaction.member.nick
    let username = message ? message.author.tag : `${interaction.member.user.username}#${interaction.member.user.discriminator}`

    const song = {
        title: songInfo.videoDetails.title,
        url: searchResults.items[0].url,
        thumbnail: songInfo.player_response.videoDetails.thumbnail.thumbnails[0].url,
        length: songInfo.videoDetails.lengthSeconds,
        nick: nickname,
        username: username,
        seek: 0
    };
    return song
}