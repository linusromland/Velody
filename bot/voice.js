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

exports.play = async (client, interaction, search) => {
    try {
        let song = await getSong(search, interaction)
        queue.push(song);
        console.log(song)
        let object = {
            song: song,
            statusCode: 404
        }
        console.log(object)
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

exports.loop = async (embed) => {
    if (loop) {
        embed.setTitle(`Disabled loop`);
        embed.setDescription(`To renable run "/loop"`);
        loop = false
    } else {
        embed.setTitle(`Enabled loop`);
        embed.setDescription(`To disable run "/loop"`);
        loop = true
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
    if (voiceChannel) await voiceChannel.leave()
    if (dispatcher) await dispatcher.destroy();
    dispatcher = null;
    voiceChannel = null;
    queue = [];
    playingMusic = false;
}

startPlay = async (client, interaction) => {
    do {
        await playMusic(client, interaction)
    } while (queue.length > 0);
    voiceChannel.leave();
}

playMusic = async (client, interaction) => {
    //if (!voiceChannel || client.voice.connections.size <= 0) await this.join(embed, client, interaction)
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

getSong = async (search, interaction) => {
    let searchResults = await ytsr(search, {
        limit: 1
    })
    let URL = searchResults.items[0].url

    const songInfo = await ytdl.getInfo(URL);
    const song = {
        title: songInfo.videoDetails.title,
        url: searchResults.items[0].url,
        thumbnail: songInfo.player_response.videoDetails.thumbnail.thumbnails[0].url,
        length: songInfo.videoDetails.lengthSeconds,
        nick: interaction.member.nick,
        username: `${interaction.member.user.username}#${interaction.member.user.discriminator}`,
        seek: 0
    };
    return song
}