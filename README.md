<h1 align="center">
  <img src="assets/logo.jpeg" width="224px"/><br/>
  Velody
</h1>
<p align="center">Velody is a <b>Discord music bot</b> written in <b>Node.JS</b> & <b>Discord.JS</b>.

<p align="center"><a href="https://github.com/linusromland/velody/releases" target="_blank"><img src="https://img.shields.io/badge/version-v2.3.0-blue?style=for-the-badge&logo=none" alt="cli version" /></a>&nbsp
<a href="https://github.com/linusromland/Velody/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-red?style=for-the-badge&logo=none" alt="license" /></a>
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
| `/clear`              | Clears the queue.                                                                   |
| `/shuffle`            | Shuffles the queue.                                                                 |
| `/skip`               | Skips the currently playing video.                                                  |
| `/voicePresenter`     | Enables or disables the Voice Presenter temporarily.                                |
| `/gpt3`               | Enables or disables the GPT-3 for the bot.                                          |
| `/getLastTTSMessage`  | Gets the last TTS message from within the last 5 minutes.                           |

## ⚡️ Setup

### Prerequisites

In order to run `Velody` natively, you will need to have the following installed:

- [Node.JS](https://nodejs.org/en/) (v16+)

If you want to run `Velody` in a Docker container, you will need to have the following installed:

- [Docker](https://www.docker.com/)

### Hardware requirements

Velody is a fairly resource intensive bot, so it is recommended to have at least 2GB of RAM and 2 CPU cores available.

Recommended hardware:

- atleast 2GB RAM
- atleast 2 X86_64 or ARM64 CPU cores

The bot will run on less, but it might be slower, less responsive and might crash more often.

### Bot Permissions

Velody requires the following permissions to function properly:

1. Discord permissions:

- Make sure the bot has the necessary permissions to read and send messages in text channels.

2. Voice Channel Interaction:

- Grant the bot permissions to join voice channels.
- Ensure the bot has sufficient permissions to speak in voice channels.

3. Slash Command Permissions:

- Ensure the bot has the necessary permissions to create slash commands in the specified guilds.

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

### Build and run Docker image

1. Clone the repository

```bash
git clone https://github.com/linusromland/Velody.git
```

2. Build the Docker image

```bash
docker build -t velody .
```

3. Run the Docker container with the required environment variables.

See [here](#-environment-variables) for more information about the environment variables.

```bash
docker run -d --name velody velody -e BOT_TOKEN=your_token_here
```

### Run Docker image from GitHub Container Registry

1. Pull the Docker image

```bash
docker pull ghcr.io/linusromland/velody:latest
```

2. Run the Docker container with the required environment variables.

See [here](#-environment-variables) for more information about the environment variables.

```bash
docker run -d --name velody ghcr.io/linusromland/velody:latest -e BOT_TOKEN=your_token_here
```

## 📦 Environment variables

| Variable             | Description                                                                                                               | Required | Default value |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| BOT_TOKEN            | The bot token of your Discord bot.                                                                                        | Yes      | -             |
| YOUTUBE_API_KEY      | The YouTube API key.                                                                                                      | Yes      | -             |
| OPENAI_API_KEY       | The OpenAI API key.                                                                                                       | No       | -             |
| OPENAI_MODEL         | The OpenAI model.                                                                                                         | No       | gpt-3.5-turbo |
| OPENAI_TTS_MODEL     | The OpenAI TTS model.                                                                                                     | No       | tts-1         |
| OPENAI_TTS_VOICE     | The OpenAI TTS voice.                                                                                                     | No       | echo          |
| MONGODB_URI          | The MongoDB URI.                                                                                                          | No       | -             |
| CACHE_MAX_SIZE_IN_MB | The maximum size of the cache in MB. (Min of 500mb)                                                                       | No       | 1000          |
| SERVER_GUILD_ID      | The ID of the server to use. Used for development to enable faster reloading of slash commands. Not needed in production. | No       | -             |

## 📝 Contact

If you have any questions, feel free to contact me on Discord: `linusromland#1012`

## ⭐️ Project assistance

If you want to say **thank you** or/and support active development of `Velody`:

- Add a [GitHub Star](https://github.com/linusromland/velody) to the project.

## ⚠️ License

`Velody` is free and open-source software licensed under the [MIT License](https://github.com/linusromland/Velody/blob/master/LICENSE).
