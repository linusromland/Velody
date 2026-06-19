<h1 align="center">
  <img src="assets/logo.jpeg" width="224px"/><br/>
  Velody
</h1>
<p align="center">Velody is a <b>Discord music bot</b> written in <b>TypeScript</b> with <b>discord.js</b>, <b>MongoDB</b>, and a modular media provider pipeline.</p>

## Features

- Slash commands: `/play`, `/skip`, `/queue`, `/now-playing`, `/leave`
- Multi-guild playback isolation: each Discord server has its own independent queue and voice session
- YouTube metadata/search via YouTube Data API
- Audio extraction via yt-dlp with fallback attempts
- MongoDB-backed extraction cache and playback history
- Strict TypeScript, linting, tests, and CI workflows

## Stack

- Node.js 22 LTS
- TypeScript 5
- discord.js v14
- @discordjs/voice
- MongoDB

## Requirements

- Node.js 22+
- MongoDB instance
- ffmpeg installed in PATH (or configured via env)
- yt-dlp installed in PATH (or configured via env)
- Discord bot token and application client id
- YouTube Data API key

## Local Development

1. Install dependencies:

  npm install

2. Copy environment template and fill values:

  cp .env.example .env

3. Start in watch mode:

  npm run dev

4. Build and run production bundle:

  npm run build
  npm start

## Environment Variables

- `DISCORD_TOKEN`: bot token
- `DISCORD_CLIENT_ID`: application client id
- `MONGODB_URI`: mongodb connection string
- `MONGODB_DB_NAME`: mongodb database name
- `YOUTUBE_API_KEY`: youtube data api key
- `YTDLP_PATH`: path to yt-dlp binary (default `yt-dlp`)
- `FFMPEG_PATH`: path to ffmpeg binary (default `ffmpeg`)
- `YTDLP_COOKIES_FILE`: optional cookies file path for restricted content
- `YTDLP_PROXY`: optional proxy for extraction fallback
- `CACHE_DIR`: reserved for local media cache extension
- `PREFETCH_COUNT`: reserved prefetch worker size
- `MAX_QUEUE_SIZE`: maximum queue length per guild

## Architecture Overview

- `src/commands`: slash command definitions and interaction handling
- `src/services`: application services that orchestrate providers and playback
- `src/core/playback`: per-guild playback sessions, queueing, and voice control
- `src/providers`: source-specific modules (YouTube search and yt-dlp extraction)
- `src/infrastructure/mongo`: persistence repositories and indexes

The playback core is designed so source adapters can be swapped or extended later.

## Docker

Build image:

docker build -t velody:local .

Run image:

docker run --env-file .env velody:local

## Notes on yt-dlp Reliability

YouTube extraction can break due to upstream changes. Velody already supports fallback extraction attempts and optional cookies/proxy configuration. For production stability:

- keep yt-dlp up to date
- configure `YTDLP_COOKIES_FILE` for age/region restricted videos
- configure `YTDLP_PROXY` if your deployment region needs alternate routing

## License

Velody is free and open-source software licensed under the [MIT License](LICENSE).
