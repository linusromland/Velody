<h1 align="center">
  <img src="assets/logo.jpeg" width="224px"/><br/>
  Velody
</h1>
<p align="center">Velody is a <b>Discord music bot</b> written in <b>Python</b>.


## ⚙️ Commands

| Command                    | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `!play <query>`            | Search for a video/song and play it.                       |
| `!skip`                    | Skip the current track.                                     |
| `!pause`                   | Pause the current track.                                    |
| `!resume`                  | Resume the paused track.                                    |
| `!queue`                   | Display the current queue.                                  |
| `!nowplaying`              | Display the current track.                                  |
| `!join`                    | Join the voice channel.                                     |
| `!leave`                   | Leave the voice channel and clear the queue.               |

## ⚡️ Setup

### Prerequisites

In order to run `Velody` natively, you will need to have the following installed:

- [Python 3.8+](https://www.python.org/downloads/)
- [FFmpeg](https://ffmpeg.org/download.html) (for audio processing)

If you want to run `Velody` in a Docker container, you will need to have the following installed:

- [Docker](https://www.docker.com/)

### Bot Permissions

Velody requires the following permissions to function properly:

1. Discord permissions:

- Make sure the bot has the necessary permissions to read and send messages in text channels.

2. Voice Channel Interaction:

- Grant the bot permissions to join voice channels.
- Ensure the bot has sufficient permissions to speak in voice channels.

### Running natively

1. Clone the repository

```bash
git clone https://github.com/linusromland/Velody.git
cd Velody
```

2. Install dependencies

```bash
pip install -r requirements.txt
```

3. Configuration

```bash
cp config.ini.example config.ini
```

Then, fill in the configuration values in the `config.ini` file. Alternatively, you can set the `DISCORD_TOKEN` environment variable.

4. Run the bot

```bash
python src/main.py
```

### Build and run Docker image

1. Clone the repository

```bash
git clone https://github.com/linusromland/Velody.git
cd Velody
```

2. Build the Docker image

```bash
docker build -t velody .
```

3. Run the Docker container with the required environment variables.

See [here](#-environment-variables) for more information about the environment variables.

```bash
docker run -d --name velody -e DISCORD_TOKEN=your_token_here velody
```

### Run Docker image from GitHub Container Registry

1. Pull the Docker image

```bash
docker pull ghcr.io/linusromland/velody:latest
```

2. Run the Docker container with the required environment variables.

See [here](#-environment-variables) for more information about the environment variables.

```bash
docker run -d --name velody -e DISCORD_TOKEN=your_token_here ghcr.io/linusromland/velody:latest
```

## 📦 Environment variables

| Variable      | Description                        | Required | Default value |
| ------------- | ---------------------------------- | -------- | ------------- |
| DISCORD_TOKEN | The bot token of your Discord bot. | Yes      | -             |

The bot token can also be provided via the `config.ini` file in the `[discord]` section as `token = your_token_here`.

## 📝 Contact

If you have any questions, feel free to contact me on Discord: `linusromland`

## ⭐️ Project assistance

If you want to say **thank you** or/and support active development of `Velody`:

- Add a [GitHub Star](https://github.com/linusromland/velody) to the project.

## ⚠️ License

`Velody` is free and open-source software licensed under the [MIT License](https://github.com/linusromland/Velody/blob/master/LICENSE).
