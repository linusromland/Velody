import { access } from "node:fs/promises";

import type { Track } from "../types";
import type { DownloadedMediaRepository } from "../../infrastructure/mongo/repositories";
import type { AudioExtractionProvider } from "../../providers/interfaces";
import { createLogger } from "../../utils/logger";

const logger = createLogger("PrefetchWorker");

interface PrefetchJob {
    track: Track;
}

export class PrefetchWorker {
    private readonly queue: PrefetchJob[] = [];
    private readonly inFlight = new Set<string>();
    private activeWorkers = 0;

    public constructor(
        private readonly extractionProvider: AudioExtractionProvider,
        private readonly downloadedMediaRepository: DownloadedMediaRepository,
        private readonly cacheDir: string,
        private readonly concurrency: number,
        private readonly ttlHours: number
    ) { }

    public scheduleTracks(tracks: Track[]): void {
        logger.debug("Scheduling tracks for prefetch", {
            requestedTracks: tracks.length,
            queueLength: this.queue.length,
            inFlightCount: this.inFlight.size
        });

        const now = new Date();

        for (const track of tracks) {
            if (this.inFlight.has(track.id)) {
                logger.debug("Skipping already in-flight prefetch track", {
                    trackId: track.id
                });
                continue;
            }

            this.inFlight.add(track.id);
            this.queue.push({ track });
            logger.debug("Track added to prefetch queue", {
                trackId: track.id,
                queueLength: this.queue.length
            });
        }

        if (tracks.length > 0) {
            void this.primeFromExistingCache(now, tracks);
        }

        this.pump();
    }

    private async primeFromExistingCache(now: Date, tracks: Track[]): Promise<void> {
        for (const track of tracks) {
            const existing = await this.downloadedMediaRepository.findValid(track.id, now);
            if (existing) {
                this.inFlight.delete(track.id);
                logger.debug("Track already exists in downloaded cache", {
                    trackId: track.id,
                    filePath: existing.filePath
                });
            }
        }
    }

    private pump(): void {
        while (this.activeWorkers < this.concurrency && this.queue.length > 0) {
            const job = this.queue.shift();
            if (!job) {
                return;
            }

            this.activeWorkers += 1;
            logger.debug("Starting prefetch worker", {
                activeWorkers: this.activeWorkers,
                remainingQueue: this.queue.length,
                trackId: job.track.id
            });
            void this.execute(job)
                .catch((error) => {
                    logger.warn("Prefetch job failed", {
                        trackId: job.track.id,
                        error
                    });
                    // Keep prefetch failures isolated from playback flow.
                })
                .finally(() => {
                    this.activeWorkers -= 1;
                    logger.debug("Prefetch worker finished", {
                        activeWorkers: this.activeWorkers,
                        remainingQueue: this.queue.length,
                        trackId: job.track.id
                    });
                    this.pump();
                });
        }
    }

    private async execute(job: PrefetchJob): Promise<void> {
        try {
            logger.debug("Executing prefetch job", {
                trackId: job.track.id,
                title: job.track.title
            });
            const existing = await this.downloadedMediaRepository.findValid(job.track.id, new Date());
            if (existing) {
                try {
                    await access(existing.filePath);
                    logger.debug("Prefetch skipped, cache file already present", {
                        trackId: job.track.id,
                        filePath: existing.filePath
                    });
                    return;
                } catch {
                    logger.warn("Prefetch found stale cache metadata", {
                        trackId: job.track.id,
                        filePath: existing.filePath
                    });
                    // Stale file record; refresh by downloading again.
                }
            }

            const filePath = await this.extractionProvider.downloadToCache(job.track, this.cacheDir);
            await this.downloadedMediaRepository.upsert({
                trackId: job.track.id,
                filePath,
                expiresAt: new Date(Date.now() + this.ttlHours * 60 * 60 * 1000),
                createdAt: new Date()
            });
            logger.info("Prefetch cached track successfully", {
                trackId: job.track.id,
                filePath,
                ttlHours: this.ttlHours
            });
        } finally {
            this.inFlight.delete(job.track.id);
            logger.debug("Prefetch in-flight marker cleared", {
                trackId: job.track.id,
                inFlightCount: this.inFlight.size
            });
        }
    }
}
