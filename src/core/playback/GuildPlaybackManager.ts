import type { GuildMember } from "discord.js";

import type { QueueItem } from "../types";
import type {
    CacheRepository,
    DownloadedMediaRepository,
    PlaybackHistoryRepository
} from "../../infrastructure/mongo/repositories";
import type { AudioExtractionProvider } from "../../providers/interfaces";
import type { PrefetchWorker } from "../prefetch/PrefetchWorker";
import { GuildPlaybackSession } from "./GuildPlaybackSession";
import { createLogger } from "../../utils/logger";

const logger = createLogger("GuildPlaybackManager");

export class GuildPlaybackManager {
    private readonly sessions = new Map<string, GuildPlaybackSession>();

    public constructor(
        private readonly extractionProvider: AudioExtractionProvider,
        private readonly ffmpegPath: string,
        private readonly cacheRepository: CacheRepository,
        private readonly downloadedMediaRepository: DownloadedMediaRepository,
        private readonly historyRepository: PlaybackHistoryRepository,
        private readonly prefetchWorker: PrefetchWorker,
        private readonly prefetchCount: number,
        private readonly maxQueueSize: number
    ) { }

    public async enqueue(guildId: string, member: GuildMember, item: QueueItem): Promise<void> {
        logger.debug("Enqueue requested", {
            guildId,
            trackId: item.track.id,
            trackTitle: item.track.title,
            requestedBy: item.requestedBy
        });
        const session = this.getOrCreate(guildId);
        await session.enqueue(member, item);
    }

    public async skip(guildId: string): Promise<QueueItem | null> {
        logger.debug("Skip requested", { guildId });
        const session = this.getOrCreate(guildId);
        return session.skip();
    }

    public async leave(guildId: string): Promise<void> {
        logger.debug("Leave requested", { guildId });
        const session = this.sessions.get(guildId);
        if (!session) {
            logger.debug("No existing session to leave", { guildId });
            return;
        }

        await session.leave();
        this.sessions.delete(guildId);
        logger.info("Destroyed guild playback session", { guildId });
    }

    public getState(guildId: string) {
        const session = this.getOrCreate(guildId);
        return session.getState();
    }

    private getOrCreate(guildId: string): GuildPlaybackSession {
        const existing = this.sessions.get(guildId);
        if (existing) {
            logger.debug("Using existing guild playback session", { guildId });
            return existing;
        }

        const created = new GuildPlaybackSession(
            guildId,
            this.extractionProvider,
            this.ffmpegPath,
            this.cacheRepository,
            this.downloadedMediaRepository,
            this.historyRepository,
            this.prefetchWorker,
            this.prefetchCount,
            this.maxQueueSize
        );

        this.sessions.set(guildId, created);
        logger.info("Created guild playback session", {
            guildId,
            sessionCount: this.sessions.size
        });
        return created;
    }
}
