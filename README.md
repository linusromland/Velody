<h1 align="center">
  <img src="assets/logo.jpeg" width="224px"/><br/>
  Velody
</h1>
<p align="center">Velody is a <b>Discord music bot</b> written in <b>C#</b>.

<p align="center"><a href="https://github.com/linusromland/velody/releases" target="_blank"><img src="https://img.shields.io/badge/version-v3.2.0-blue?style=for-the-badge&logo=none" alt="Velody version" /></a>&nbsp
<a href="https://github.com/linusromland/Velody/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-red?style=for-the-badge&logo=none" alt="license" /></a>
</p>

## ⚙️ Commands

| Command                    | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `/play <query>`            | Search for a video and play it.                             |
| `/playSkip <query>`        | Search for a video and play it, skipping the current video. |
| `/playTop <query>`         | Search for a video and add it to the top of the queue.      |
| `/skip`                    | Skip the current video.                                     |
| `/queue`                   | Display the current queue.                                  |
| `/shuffle`                 | Shuffle the queue.                                          |
| `/clearqueue`              | Clear the current queue.                                    |
| `/loop`                    | Toggle loop mode.                                           |
| `/loopqueue`               | Toggle loop queue mode.                                     |
| `/nowPlaying`              | Display the current video.                                  |
| `/remove <index>`          | Remove a video from the queue.                              |
| `/lastAnnouncementMessage` | Display the last announcement message.                      |
| `/presenter`               | Toggle the presenter feature.                               |
| `/history`                 | Display the last played videos.                             |
| `/leave`                   | Leave the voice channel.                                    |

## ⚡️ Setup

### Prerequisites

In order to run `Velody` natively, you will need to have the following installed:

- [Dotnet 9.0](https://dotnet.microsoft.com/download/dotnet/9.0)

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

2. Environment variables

```bash
cp .env.example .env
```

Then, fill in the environment variables in the `.env` file. More information about the environment variables can be found [here](#-environment-variables).

3. Run the bot

```bash
dotnet run
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

| Variable           | Description                                                                         | Required                     | Default value         |
| ------------------ | ----------------------------------------------------------------------------------- | ---------------------------- | --------------------- |
| DiscordBotToken    | The bot token of your Discord bot.                                                  | Yes                          | -                     |
| DiscordGuildId     | The ID of the Discord guild where the bot will be used.                             | No                           | -                     |
| GoogleApiKey       | The API key for the Google API.                                                     | Yes                          | -                     |
| OpenAIApiKey       | The API key for the OpenAI API.                                                     | If using OpenAITextGenerator | -                     |
| PresenterEnabled   | Whether the presenter feature should be enabled.                                    | No                           | true                  |
| TextGenerator      | Which text generator to use. Options: `SimpleTextGenerator`, `OpenAITextGenerator`. | No                           | `SimpleTextGenerator` |
| TTSProvider        | Which TTS provider to use. Options: `GoogleTTS`.                                    | No                           | `GoogleTTS`           |
| AnnouncePercentage | How often the bot should announce the video. (0-100)                                | No                           | 100                   |

If `PresenterEnabled` is set to `false`, `TextGenerator`, `TTSProvider` and `AnnouncePercentage` will be ignored.

## 📝 Contact

If you have any questions, feel free to contact me on Discord: `linusromland`

## ⭐️ Project assistance

If you want to say **thank you** or/and support active development of `Velody`:

- Add a [GitHub Star](https://github.com/linusromland/velody) to the project.

## ⚠️ License

`Velody` is free and open-source software licensed under the [MIT License](https://github.com/linusromland/Velody/blob/master/LICENSE).
