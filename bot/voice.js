//init of dotenv
require("dotenv").config();

let voiceChannel;
let voiceConnection;
let dispatcher;
let queue = [];
let loop = false;
let loopqueue = false;
let playingMusic = false;

const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');
const validUrl = require('valid-url');
const fs = require('fs');

let opts = {
    maxResults: 10,
    key: process.env.YOUTUBE_KEY,
};

exports.join = async (message, client, interaction) => {
    let object = {
        statusCode: 401
    };
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
        name: name
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

        if (song.type == "pl") {
            song.playlist.items.forEach(item => {
                let nickname = message ? message.member.nickname : interaction.member.nick
                let username = message ? message.author.tag : `${interaction.member.user.username}#${interaction.member.user.discriminator}`

                const song = {
                    title: item.title,
                    url: item.url,
                    thumbnail: item.bestThumbnail.url,
                    length: item.durationSec,
                    nick: nickname,
                    username: username,
                    seek: 0
                };
                queue.push(song);
            });
        } else {
            queue.push(song);
        }
        let object = {
            song: song,
            statusCode: 404
        }
        if (song.type == "pl") {
            object.statusCode = 300;
            startPlay(client, interaction)
            return object;
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
        console.error(error);
        return {
            statusCode: 400,
            error: error
        };
    }
}

exports.playskip = async (client, interaction, search, message) => {
    let object = {
        statusCode: 401,
    }
    if(ytPlaylist(search)){
        object.statusCode = 323
        return object;
    }
    if (queue.length > 0) {
        let song = await getSong(search, interaction, message, client)
        if (!song) {
            object.statusCode = 404;
            return object
        }
        queue.splice(1, 0, song)
        this.skip()
        object.song = song
        object.statusCode = 200
    } else {
        object = await this.play(client, interaction, search, message)
    }
    return object
}

exports.skip = async () => {
    let object = {
        statusCode: 401,
        info: {}
    }
    if (queue.length > 0) {
        object.statusCode = 200
        object.info.skipped = queue[0].title
        if (queue[1]) object.info.upcoming = queue[1].title;
        dispatcher.end();
    } else {
        object.statusCode = 201
    }

    return object;
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

exports.loopqueue = async () => {
    if (loopqueue) {
        loopqueue = false
        return 200
    } else {
        loopqueue = true
        return 201
    }
}

exports.shuffle = async () => {
    let firstSong = queue[0]
    queue.shift();
    queue = shuffleQueue(queue);
    queue.unshift(firstSong)
    return 200;
}

exports.clear = async () => {
    let firstSong = queue[0]
    queue = []
    queue.push(firstSong)
    return 200;
}

exports.nowplaying = () => {
    let object = {
        statusCode: 401
    }
    if (queue.length > 0) {
        object.statusCode = 200
        object.info = {
            title: queue[0].title,
            length: queue[0].length,
            dispatcherStreamTime: dispatcher.streamTime,
            nick: queue[0].nick,
            username: queue[0].username,
            url: queue[0].url,
            thumbnail: queue[0].thumbnail
        }
    } else {
        object.statusCode = 201
    }

    return object;
}

exports.queue = () => {
    let object = {
        statusCode: 401,
        description: {},
    };
    if (queue.length >= 1 && playingMusic) {
        let description = `__Now Playing:__
        [${queue[0].title}](${queue[0].url}) - ${new Date(queue[0].length * 1000).toISOString().substr(14, 5)}
        \n`
        if (queue.length > 1) description += "__Up next:__\n"
        let nextLength = 11;
        let length = queue.length > nextLength ? nextLength : queue.length
        for (let i = 1; i < length; i++) {
            const element = queue[i];
            description += "``" + i + ".``" + ` [${element.title}](${element.url}) - ${new Date(element.length * 1000).toISOString().substr(14, 5)}\n
            `
        }
        if (queue.length > nextLength) description += `and ${queue.length - nextLength} more songs in queue!`
        object.statusCode = 200;
        object.description = description;
    } else {
        object.statusCode = 201;
    }
    return object;
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
                if(loopqueue && !loop) queue.push(queue[0])
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
    let URL;
    if (!validURL(search)) {
        let searchResults = await ytsr(search, {
            limit: 1
        })
        URL = searchResults.items[0].url
    } else if (ytPlaylist(search)) {
        const playlist = await ytpl(search);
        return {
            type: "pl",
            playlist: playlist
        }
    } else {
        URL = search
    }

    const songInfo = await ytdl.getInfo(URL);

    let song = createSong(message, songInfo, interaction, URL)
    return song
}

validURL = (url) => {
    let pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    if (!!pattern.test(url)) {
        let domain = new URL(url);
        if (domain.hostname == "www.youtube.com") {
            return true;
        }
    }
    return false;
}

ytPlaylist = (url) => {
    if (validURL(url)) {
        let domain = new URL(url);
        if (domain.pathname == "/playlist") return true;
    }
    return false;
}

createSong = (message, songInfo, interaction, url) => {
    let nickname = message ? message.member.nickname : interaction.member.nick
    let username = message ? message.author.tag : `${interaction.member.user.username}#${interaction.member.user.discriminator}`

    const song = {
        type: "song",
        title: songInfo.videoDetails.title,
        url: url,
        thumbnail: songInfo.player_response.videoDetails.thumbnail.thumbnails[0].url,
        length: songInfo.videoDetails.lengthSeconds,
        nick: nickname,
        username: username,
        seek: 0
    };
    return song
}

shuffleQueue = (array) => {
    let m = array.length, t, i;
  
    while (m) {
  
      i = Math.floor(Math.random() * m--);
  
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
  
    return array;
  }