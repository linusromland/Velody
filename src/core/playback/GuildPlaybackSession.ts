import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    type VoiceConnection
} from "@discordjs/voice";
import { access } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import type { GuildMember } from "discord.js";
import prism from "prism-media";

import { AsyncMutex } from "../asyncMutex";
import type { PlaybackState, QueueItem } from "../types";
import type {
    CacheRepository,
    DownloadedMediaRepository,
    PlaybackHistoryRepository
} from "../../infrastructure/mongo/repositories";
import type { AudioExtractionProvider } from "../../providers/interfaces";
import type { PrefetchWorker } from "../prefetch/PrefetchWorker";
import { createLogger } from "../../utils/logger";

const logger = createLogger("GuildPlaybackSession");

export class GuildPlaybackSession {
    private readonly mutex = new AsyncMutex();
    private readonly queue: QueueItem[] = [];
    private nowPlaying: QueueItem | null = null;
    private readonly player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause
        }
    });

    private voiceChannelId: string | null = null;
    private connection: VoiceConnection | null = null;

    public constructor(
        private readonly guildId: string,
        private readonly extractionProvider: AudioExtractionProvider,
        private readonly ffmpegPath: string,
        private readonly cacheRepository: CacheRepository,
        private readonly downloadedMediaRepository: DownloadedMediaRepository,
        private readonly historyRepository: PlaybackHistoryRepository,
        private readonly prefetchWorker: PrefetchWorker,
        private readonly prefetchCount: number,
        private readonly maxQueueSize: number
    ) {
        logger.info("Initializing playback session", {
            guildId: this.guildId,
            prefetchCount: this.prefetchCount,
            maxQueueSize: this.maxQueueSize
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            logger.debug("Audio player became idle", { guildId: this.guildId });
            void this.playNext();
        });

        this.player.on("error", (error) => {
            logger.error("Audio player emitted error", {
                guildId: this.guildId,
                error
            });
            void this.playNext();
        });
    }

    public getState(): PlaybackState {
        return {
            guildId: this.guildId,
            voiceChannelId: this.voiceChannelId,
            nowPlaying: this.nowPlaying,
            queue: [...this.queue],
            isPlaying: this.nowPlaying !== null
        };
    }

    public async enqueue(member: GuildMember, item: QueueItem): Promise<void> {
        await this.mutex.runExclusive(async () => {
            logger.info("Queueing track", {
                guildId: this.guildId,
                trackId: item.track.id,
                trackTitle: item.track.title,
                queueLengthBefore: this.queue.length
            });

            if (this.queue.length >= this.maxQueueSize) {
                logger.warn("Queue is full", {
                    guildId: this.guildId,
                    maxQueueSize: this.maxQueueSize
                });
                throw new Error("Queue is full for this server.");
            }

            await this.ensureConnected(member);
            this.queue.push(item);
            logger.debug("Track added to queue", {
                guildId: this.guildId,
                queueLengthAfter: this.queue.length
            });
            this.prefetchUpcoming();

            if (!this.nowPlaying) {
                logger.debug("No active playback, starting next track", {
                    guildId: this.guildId
                });
                await this.playNextInternal();
            }
        });
    }

    public async skip(): Promise<QueueItem | null> {
        return this.mutex.runExclusive(async () => {
            const skipped = this.nowPlaying;
            logger.info("Skip requested in session", {
                guildId: this.guildId,
                skippedTrackId: skipped?.track.id,
                skippedTrackTitle: skipped?.track.title
            });
            this.player.stop();
            return skipped;
        });
    }

    public async leave(): Promise<void> {
        await this.mutex.runExclusive(async () => {
            logger.info("Leaving playback session", {
                guildId: this.guildId,
                queuedTracks: this.queue.length,
                hadNowPlaying: Boolean(this.nowPlaying)
            });
            this.queue.length = 0;
            this.nowPlaying = null;
            this.player.stop(true);

            if (this.connection) {
                this.connection.destroy();
                this.connection = null;
            }

            this.voiceChannelId = null;
            logger.debug("Playback session cleared", { guildId: this.guildId });
        });
    }

    private async ensureConnected(member: GuildMember): Promise<void> {
        const voiceChannel = member.voice.channel;

        if (!voiceChannel || !voiceChannel.isVoiceBased()) {
            logger.warn("User attempted playback without voice channel", {
                guildId: this.guildId,
                userId: member.id
            });
            throw new Error("Join a voice channel first.");
        }

        if (this.connection && this.voiceChannelId === voiceChannel.id) {
            logger.debug("Voice connection already established", {
                guildId: this.guildId,
                voiceChannelId: voiceChannel.id
            });
            return;
        }

        logger.info("Joining voice channel", {
            guildId: this.guildId,
            voiceChannelId: voiceChannel.id
        });
        this.connection?.destroy();

        let connection: VoiceConnection | null = null;
        let lastError: unknown;

        for (let attempt = 1; attempt <= 2; attempt += 1) {
            connection?.destroy();

            connection = joinVoiceChannel({
                guildId: member.guild.id,
                channelId: voiceChannel.id,
                adapterCreator: member.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            connection.on("error", (error) => {
                logger.error("Voice connection emitted error", {
                    guildId: this.guildId,
                    attempt,
                    voiceChannelId: this.voiceChannelId,
                    error
                });
            });

            this.connection = connection;
            this.voiceChannelId = voiceChannel.id;

            try {
                logger.info("Waiting for voice connection readiness", {
                    guildId: this.guildId,
                    attempt,
                    voiceChannelId: this.voiceChannelId
                });
                await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
                connection.subscribe(this.player);
                logger.info("Voice connection ready", {
                    guildId: this.guildId,
                    attempt,
                    voiceChannelId: this.voiceChannelId
                });
                return;
            } catch (error) {
                lastError = error;
                logger.warn("Voice connection attempt timed out", {
                    guildId: this.guildId,
                    attempt,
                    voiceChannelId: this.voiceChannelId,
                    error
                });

                if (attempt < 2) {
                    await delay(1000);
                }
            }
        }

        connection?.destroy();
        this.connection = null;
        this.voiceChannelId = null;

        logger.error("Voice connection failed after all attempts", {
            guildId: this.guildId,
            voiceChannelId: voiceChannel.id,
            error: lastError
        });

        throw new Error(
            "Could not establish a stable voice connection. This is usually a Discord voice handshake issue (or multiple bot instances). Ensure only one bot process is running and try moving the voice channel region to Automatic."
        );
    }

    private async playNext(): Promise<void> {
        return this.mutex.runExclusive(async () => {
            await this.playNextInternal();
        });
    }

    private async playNextInternal(): Promise<void> {
        const next = this.queue.shift() ?? null;
        this.nowPlaying = next;

        if (!next) {
            logger.debug("No next track available", { guildId: this.guildId });
            return;
        }

        logger.info("Starting playback for next track", {
            guildId: this.guildId,
            trackId: next.track.id,
            trackTitle: next.track.title,
            remainingQueue: this.queue.length
        });

        await this.historyRepository.recordPlay(this.guildId, next);

        const cached = await this.cacheRepository.findValid(next.track.id, new Date());
        const downloaded = await this.downloadedMediaRepository.findValid(next.track.id, new Date());

        let inputTarget: string | null = null;
        if (downloaded) {
            try {
                await access(downloaded.filePath);
                inputTarget = downloaded.filePath;
                logger.info("Using downloaded media cache", {
                    guildId: this.guildId,
                    trackId: next.track.id,
                    filePath: downloaded.filePath
                });
            } catch {
                logger.warn("Downloaded media cache entry missing file, falling back", {
                    guildId: this.guildId,
                    trackId: next.track.id,
                    filePath: downloaded.filePath
                });
                inputTarget = null;
            }
        }

        if (!inputTarget) {
            if (cached) {
                inputTarget = cached.streamUrl;
                logger.info("Using extraction URL cache", {
                    guildId: this.guildId,
                    trackId: next.track.id
                });
            } else {
                const extracted = await this.extractionProvider.extract(next.track);
                await this.cacheRepository.upsert({
                    trackId: next.track.id,
                    streamUrl: extracted.streamUrl,
                    expiresAt: extracted.expiresAt,
                    createdAt: new Date()
                });
                inputTarget = extracted.streamUrl;
                logger.info("Extracted fresh stream URL", {
                    guildId: this.guildId,
                    trackId: next.track.id,
                    expiresAt: extracted.expiresAt.toISOString()
                });
            }
        }

        const ffmpeg = new prism.FFmpeg({
            args: [
                "-reconnect",
                "1",
                "-reconnect_streamed",
                "1",
                "-reconnect_delay_max",
                "5",
                "-i",
                inputTarget,
                "-analyzeduration",
                "0",
                "-loglevel",
                "0",
                "-f",
                "s16le",
                "-ar",
                "48000",
                "-ac",
                "2"
            ]
        });

        const resource = createAudioResource(ffmpeg, {
            inlineVolume: false,
            metadata: next
        });

        this.player.play(resource);
        logger.info("Playback started", {
            guildId: this.guildId,
            trackId: next.track.id,
            trackTitle: next.track.title
        });
        this.prefetchUpcoming();
    }

    private prefetchUpcoming(): void {
        if (this.prefetchCount <= 0 || this.queue.length === 0) {
            return;
        }

        logger.debug("Scheduling prefetch for upcoming tracks", {
            guildId: this.guildId,
            requestedPrefetchCount: this.prefetchCount,
            queueLength: this.queue.length
        });

        this.prefetchWorker.scheduleTracks(
            this.queue.slice(0, this.prefetchCount).map((queueItem) => queueItem.track)
        );
    }
}
