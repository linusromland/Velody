import type { Collection, Db } from "mongodb";

import type { CacheRecord, DownloadedMediaRecord, QueueItem } from "../../core/types";
import { createLogger } from "../../utils/logger";

const logger = createLogger("MongoRepositories");

export interface PlaybackHistoryRecord {
    guildId: string;
    trackId: string;
    title: string;
    requestedBy: string;
    playedAt: Date;
}

export class CacheRepository {
    private readonly collection: Collection<CacheRecord>;

    public constructor(db: Db) {
        this.collection = db.collection<CacheRecord>("extraction_cache");
        logger.debug("CacheRepository initialized", { collection: "extraction_cache" });
    }

    public async init(): Promise<void> {
        logger.info("Initializing extraction cache indexes");
        await this.collection.createIndex({ trackId: 1 }, { unique: true });
        await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        logger.info("Extraction cache indexes ready");
    }

    public async findValid(trackId: string, at: Date): Promise<CacheRecord | null> {
        const record = await this.collection.findOne({ trackId, expiresAt: { $gt: at } });
        logger.debug("Lookup extraction cache", {
            trackId,
            hit: Boolean(record)
        });
        return record;
    }

    public async upsert(record: CacheRecord): Promise<void> {
        logger.debug("Upserting extraction cache", {
            trackId: record.trackId,
            expiresAt: record.expiresAt.toISOString()
        });
        await this.collection.updateOne(
            { trackId: record.trackId },
            {
                $set: {
                    streamUrl: record.streamUrl,
                    expiresAt: record.expiresAt,
                    createdAt: record.createdAt
                }
            },
            { upsert: true }
        );
    }
}

export class PlaybackHistoryRepository {
    private readonly collection: Collection<PlaybackHistoryRecord>;

    public constructor(db: Db) {
        this.collection = db.collection<PlaybackHistoryRecord>("playback_history");
        logger.debug("PlaybackHistoryRepository initialized", { collection: "playback_history" });
    }

    public async init(): Promise<void> {
        logger.info("Initializing playback history indexes");
        await this.collection.createIndex({ guildId: 1, playedAt: -1 });
        await this.collection.createIndex({ playedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
        logger.info("Playback history indexes ready");
    }

    public async recordPlay(guildId: string, queueItem: QueueItem): Promise<void> {
        logger.debug("Recording playback history item", {
            guildId,
            trackId: queueItem.track.id,
            title: queueItem.track.title
        });
        await this.collection.insertOne({
            guildId,
            trackId: queueItem.track.id,
            title: queueItem.track.title,
            requestedBy: queueItem.requestedBy,
            playedAt: new Date()
        });
    }
}

export class DownloadedMediaRepository {
    private readonly collection: Collection<DownloadedMediaRecord>;

    public constructor(db: Db) {
        this.collection = db.collection<DownloadedMediaRecord>("downloaded_media_cache");
        logger.debug("DownloadedMediaRepository initialized", { collection: "downloaded_media_cache" });
    }

    public async init(): Promise<void> {
        logger.info("Initializing downloaded media cache indexes");
        await this.collection.createIndex({ trackId: 1 }, { unique: true });
        await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        logger.info("Downloaded media cache indexes ready");
    }

    public async findValid(trackId: string, at: Date): Promise<DownloadedMediaRecord | null> {
        const record = await this.collection.findOne({ trackId, expiresAt: { $gt: at } });
        logger.debug("Lookup downloaded media cache", {
            trackId,
            hit: Boolean(record)
        });
        return record;
    }

    public async upsert(record: DownloadedMediaRecord): Promise<void> {
        logger.debug("Upserting downloaded media cache", {
            trackId: record.trackId,
            filePath: record.filePath,
            expiresAt: record.expiresAt.toISOString()
        });
        await this.collection.updateOne(
            { trackId: record.trackId },
            {
                $set: {
                    filePath: record.filePath,
                    expiresAt: record.expiresAt,
                    createdAt: record.createdAt
                }
            },
            { upsert: true }
        );
    }
}
