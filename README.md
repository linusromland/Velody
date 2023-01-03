# Here you can see the development of Velody 2.0. To check out Velody 1.0, go to the [Velody 1.0 branch](https://github.com/linusromland/Velody/tree/1.0).

<hr>
<h1 align="center">
  <img src="assets/logo.jpeg" width="224px"/><br/>
  Velody
</h1>
<p align="center">Velody is a <b>Discord music bot</b> written in <b>Node.JS</b> & <b>Discord.JS</b>.

<p align="center"><a href="https://github.com/linusromland/velody/releases" target="_blank"><img src="https://img.shields.io/badge/version-v1.0.0-blue?style=for-the-badge&logo=none" alt="cli version" /></a>&nbsp;<a href="https://nodejs.org/en/" target="_blank"><img src="https://img.shields.io/badge/Node.JS-14.17+-0?style=for-the-badge&logo=nodedotjs" alt="go version" /></a>&nbsp;
<a href="https://github.com/linusromland/Velody/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-red?style=for-the-badge&logo=none" alt="license" /></a>
<a ><img src="https://img.shields.io/badge/Project%20Status-WIP-yellow?style=for-the-badge&logo=none" alt="Repo Status" /></a>
</p>

## ⚙️ Commands

| Command               | Description                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| `/join`               | Summons the bot to your voice channel.                                              |
| `/leave`              | Disconnect the bot from the voice channel it is in.                                 |
| `/loop`               | Loop the currently playing video.                                                   |
| `/loopqueue`          | Loop the queue.                                                                     |
| `/nowplaying`         | Shows what video the bot is currently playing.                                      |
| `/play <video>`       | Plays a video with the given name or URL.                                           |
| `/playtop <video>`    | Adds a video to the top of the queue.                                               |
| `/queue`              | View the queue.                                                                     |
| `/remove <position?>` | Removes from queue at location. If position is not passed, will clear entire queue. |
| `/shuffle`            | Shuffles the queue.                                                                 |
| `/skip`               | Skips the currently playing video.                                                  |

## ⚡️ Setup

### Prerequisites

In order to run `Velody` natively, you will need to have the following installed:

- [Node.JS](https://nodejs.org/en/) (v16+)

### Running natively

1. Clone the repository

```bash
git clone https://github.com/linusromland/Velody.git
```

2. Install dependencies

```bash
npm install
```

3. Environment variables

```bash
cp .env.example .env
```

Then, fill in the environment variables in the `.env` file. More information about the environment variables can be found [here](#-environment-variables).

4. Run the bot

```bash
npm run dev
```


## 📦 Environment variables

| Variable  | Description                        | Required | Default value |
| --------- | ---------------------------------- | -------- | ------------- |
| BOT_TOKEN | The bot token of your Discord bot. | Yes      | -             |

## 📝 Contact

If you have any questions, feel free to contact me on Discord: `linusromland#1012`

## ⭐️ Project assistance

If you want to say **thank you** or/and support active development of `Velody`:

- Add a [GitHub Star](https://github.com/linusromland/velody) to the project.

## ⚠️ License

`Velody` is free and open-source software licensed under the [MIT License](https://github.com/linusromland/Velody/blob/master/LICENSE).
