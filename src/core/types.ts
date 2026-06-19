export type TrackSource = "youtube";

export interface Track {
    id: string;
    title: string;
    url: string;
    durationSeconds: number | null;
    source: TrackSource;
    thumbnailUrl: string | null;
}

export interface QueueItem {
    track: Track;
    requestedBy: string;
    requestedAt: Date;
}

export interface PlaybackState {
    guildId: string;
    voiceChannelId: string | null;
    nowPlaying: QueueItem | null;
    queue: QueueItem[];
    isPlaying: boolean;
}

export interface ExtractionResult {
    streamUrl: string;
    expiresAt: Date;
}

export interface CacheRecord {
    trackId: string;
    streamUrl: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface DownloadedMediaRecord {
    trackId: string;
    filePath: string;
    expiresAt: Date;
    createdAt: Date;
}
