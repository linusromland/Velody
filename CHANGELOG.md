# Changelog

## 3.3.0 (2025-07-19)

- Update OpenAI Text Generator Model to o3.

## 3.2.2 (2025-04-08)

- Update OpenAI Text Generator Prompt.

## 3.2.1 (2025-04-03)

- Bump dependencies

## 3.2.0 (2025-01-25)

- Upgrade Docker image to be based on Ubuntu 24.04.
- Upgrade to DotNet 9.0.
- Upgade ffmpeg & yt-dlp.
- Fix bug where bot would freak out if starting a new song while leave TTS was playing.
- Update prompt for OpenAi TTS. 

## 3.1.0 (2024-08-20)

- Implemented leave command.
- Fixed bug where bot needed to be restarted if bot was kicked.

## 3.0.0 (2024-08-19)

- Rewrote the bot in C# using DSharpPlus.
- Made the bot more modular. The entire TTS, Text Generator and Sound Source can now easily be swapped out.

## 2.7.0 (2024-01-05)

- Added timeout to commands. If more than 5 commands are used within 1 minute, the user will be timed out for 1 minute.

## 2.6.1 (2024-01-03)

- Added `/history` command to get the last played song.

## 2.6.0 (2024-01-03)

- Upgraded Sapphire Framework to v5.
- Added support to pass server guild id for easier development.
- Caches TTS audio files to save on API calls.
- Added `/getLastTTSMessage` command to get the last TTS message.

## 2.5.0 (2024-01-01)

- Added the ability to save history in MongoDB.
- Implemented cache for videos, with a custom cache size.
- Fixed bug where TTS would speak twice when play command was used close to each other.
- Song is now downloaded during TTS to speed up the process.

## 2.4.1 (2024-01-01)

- Fixed issue where no commands worked for production build.

## 2.4.0 (2023-12-30)

- Currently playing song is now displayed in the bot's status.
- Added hardware requirements to documentation.
- Added bot permissions to documentation.
- Added clear command to clear the queue.
- Requested by now includes the server nickname of the user as well as the discord tag.
- Changed ts-node to tsc for running the bot.

## 2.3.1 (2023-12-22)

- Increased volume of TTS Voice Presenter.

## 2.3.0 (2023-12-09)

- Implemented real Youtube API for search. Search now works!
- Changed TTS implementation to use OpenAI TTS.

## 2.2.1 (2023-11-19)

- Added Docker image available on GitHub Container Registry
- Removed Docker Compose file

## 2.1.2 (2023-01-12)

- Fixed versioning issue.

## 2.1.1 (2023-01-12)

- Added voice presenter symbols to queue and nowplaying commands.

## 2.1.0 (2023-01-12)

- Added voice presenter.

## 2.0.0 (2023-01-03)

- Complete rewrite of the bot in TypeScript.

## 1.0.0 (2022-02-21)

- First stable release!

## 0.2.1 (2021-10-07)

- Added prefix information to help command.
- Sets bot activity to currently playing song.

## 0.2.0 (2021-09-29)

- Added playtop command to play a song without interrupting the current queue.

## 0.1.3 (2021-09-28)

- Fixed bug if the user used save commmand when no song was playing.

## 0.1.2 (2021-09-28)

- Added save command to send currently playing song to DM.
- Fixed bug where error occured if the first result is not a video.

## 0.1.1 (2021-09-28)

- Removed playskip command
- Various bug fixes

## 0.1.0 (2021-09-28)

- Added support for loop queue.
- Added support for playing playlists.
- Fixed bug with playskip command.

## 0.0.2 (2021-09-17)

- Added support for legacy prefix.
- Refactor and improvements to code.

## 0.0.1 (2021-09-16)

- Initial release
