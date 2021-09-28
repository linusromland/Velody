<h1 align="center">
  <img src="assets/logo.jpeg" width="224px"/><br/>
  Velody
</h1>
<p align="center">Velody is a <b>Discord music bot</b> written in <b>Node.JS</b> and using <b>Discord.JS, Wokcommands & ytdl-core</b>.

<p align="center"><a href="https://github.com/linusromland/velody/releases" target="_blank"><img src="https://img.shields.io/badge/version-v0.1.0-blue?style=for-the-badge&logo=none" alt="cli version" /></a>&nbsp;<a href="https://nodejs.org/en/" target="_blank"><img src="https://img.shields.io/badge/Node.JS-14.17+-0?style=for-the-badge&logo=nodedotjs" alt="go version" /></a>&nbsp;
<a href="https://github.com/linusromland/Velody/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-red?style=for-the-badge&logo=none" alt="license" /></a></p>

## ⚙️ Commands

| Command | Description |
| ------ | ---- |
| `/play <song>`| Plays a song with the given name or URL. |
| `/playskip <song>`| Adds a song to the top of the queue then skips to it. |
| `/join`| Summons the bot to your voice channel.. |
| `/leave`| Disconnect the bot from the voice channel it is in. |
| `/nowplaying`| Shows what song the bot is currently playing. |
| `/skip`| Skips the currently playing song. |
| `/loop`| Loop the currently playing song. |
| `/loopqueue`| Loop the queue. |
| `/queue`| View the queue.  |
| `/clear`| Clears the queue.  |
| `/shuffle`| Shuffles the queue.  |

## ⚡️ Setup


First of all, [download](https://nodejs.org/en/) and install **Node.JS**. Version `14` or higher is required.

> If need help to **install Node.JS on Linux**, you can find a guide [here](https://www.digitalocean.com/community/tutorial_collections/how-to-install-node-js).

To confirm your installation of Node.JS run the following in the terminal or CMD:

```bash
node -v
```

### Setup:

```bash
# Clone the repo:
git clone https://github.com/linusromland/Velody.git

# Navigate to folder:
cd Velody/

#Navigate to folder (for Windows):
dir Velody/

#Install necessary dependencies:
npm install

#Create .env file
touch .env

#Create .env file (for Windows):
type nul > .env
```

Now you need to setup your .env file. To do this you need to create a Discord Bot and invite it to your server.

> If need help to **creating a discord bot**, you can find a guide [here](https://dsharpplus.github.io/articles/basics/bot_account.html).

Also enable slash commands for the bot!

Setup your .env as following:

```bash
TOKEN=YOUR_DISCORD_BOT_TOKEN
```

Next, you can start the bot using the following command:

```bash
npm run start
```

That's all you need to know to start! 🎉
## 📝 Contact

If you find issues please report them on the [issue](https://github.com/linusromland/Velody/issues) section of the repository.

If you have any features requests or other improvements to the project they are more then welcome. Add a [issue](https://github.com/linusromland/Velody/issues) on the repository and i will check them out!

## ⭐️ Project assistance

If you want to say **thank you** or/and support active development of `Velody`:

- Add a [GitHub Star](https://github.com/linusromland/velody) to the project.

Together, we can make this project **better** every day! 

## ⚠️ License

`Velody` is free and open-source software licensed under the [MIT License](https://github.com/linusromland/Velody/blob/master/LICENSE).
