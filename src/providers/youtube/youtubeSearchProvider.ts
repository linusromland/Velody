import type { Track } from "../../core/types";
import type { SearchProvider } from "../interfaces";
import { createLogger } from "../../utils/logger";

const logger = createLogger("YoutubeSearchProvider");

interface YoutubeSearchItem {
    id: { videoId?: string };
    snippet: {
        title: string;
        thumbnails?: {
            high?: { url: string };
            medium?: { url: string };
            default?: { url: string };
        };
    };
}

interface YoutubeSearchResponse {
    items: YoutubeSearchItem[];
}

interface YoutubeVideosItem {
    id: string;
    snippet: {
        title: string;
        thumbnails?: {
            high?: { url: string };
            medium?: { url: string };
            default?: { url: string };
        };
    };
    contentDetails?: {
        duration?: string;
    };
}

interface YoutubeVideosResponse {
    items: YoutubeVideosItem[];
}

interface YoutubePlaylistItemsResponse {
    nextPageToken?: string;
    items: Array<{
        snippet?: {
            resourceId?: {
                videoId?: string;
            };
        };
    }>;
}

const ISO_DURATION_REGEX = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;

const parseIsoDuration = (duration: string | undefined): number | null => {
    if (!duration) {
        return null;
    }

    const match = ISO_DURATION_REGEX.exec(duration);
    if (!match) {
        return null;
    }

    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);

    return (hours * 60 + minutes) * 60 + seconds;
};

const getThumbnail = (item: {
    snippet: {
        thumbnails?: {
            high?: { url: string };
            medium?: { url: string };
            default?: { url: string };
        };
    };
}): string | null => {
    return (
        item.snippet.thumbnails?.high?.url ??
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        null
    );
};

export class YoutubeSearchProvider implements SearchProvider {
    public constructor(private readonly apiKey: string) { }

    public async search(query: string): Promise<Track[]> {
        logger.info("Searching YouTube", { query });
        const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        searchUrl.searchParams.set("part", "snippet");
        searchUrl.searchParams.set("q", query);
        searchUrl.searchParams.set("maxResults", "5");
        searchUrl.searchParams.set("type", "video");
        searchUrl.searchParams.set("key", this.apiKey);

        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            logger.error("YouTube search request failed", {
                status: searchResponse.status,
                query
            });
            throw new Error(`YouTube search failed (${searchResponse.status})`);
        }

        const searchJson = (await searchResponse.json()) as YoutubeSearchResponse;
        const videoIds = searchJson.items
            .map((item) => item.id.videoId)
            .filter((id): id is string => typeof id === "string" && id.length > 0);

        if (videoIds.length === 0) {
            logger.info("YouTube search returned no video ids", { query });
            return [];
        }

        const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
        detailsUrl.searchParams.set("part", "snippet,contentDetails");
        detailsUrl.searchParams.set("id", videoIds.join(","));
        detailsUrl.searchParams.set("key", this.apiKey);

        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) {
            logger.error("YouTube details lookup failed", {
                status: detailsResponse.status,
                query,
                requestedCount: videoIds.length
            });
            throw new Error(`YouTube details lookup failed (${detailsResponse.status})`);
        }

        const detailsJson = (await detailsResponse.json()) as YoutubeVideosResponse;

        const tracks = detailsJson.items.map((item) => ({
            id: item.id,
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id}`,
            durationSeconds: parseIsoDuration(item.contentDetails?.duration),
            source: "youtube" as const,
            thumbnailUrl: getThumbnail(item)
        }));

        logger.info("YouTube search resolved tracks", {
            query,
            count: tracks.length
        });

        return tracks;
    }

    public async getByUrl(url: string): Promise<Track | null> {
        logger.info("Resolving YouTube track by URL", { url });
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            logger.warn("URL did not contain a valid YouTube video id", { url });
            return null;
        }

        const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
        detailsUrl.searchParams.set("part", "snippet,contentDetails");
        detailsUrl.searchParams.set("id", videoId);
        detailsUrl.searchParams.set("key", this.apiKey);

        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) {
            logger.error("YouTube details lookup failed by URL", {
                status: detailsResponse.status,
                url,
                videoId
            });
            throw new Error(`YouTube details lookup failed (${detailsResponse.status})`);
        }

        const detailsJson = (await detailsResponse.json()) as YoutubeVideosResponse;
        const item = detailsJson.items[0];
        if (!item) {
            logger.info("No YouTube video found for id", { videoId, url });
            return null;
        }

        logger.info("Resolved YouTube track by URL", {
            videoId,
            title: item.snippet.title
        });

        return {
            id: item.id,
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id}`,
            durationSeconds: parseIsoDuration(item.contentDetails?.duration),
            source: "youtube",
            thumbnailUrl: getThumbnail(item)
        };
    }

    public async getPlaylistByUrl(url: string, maxItems: number): Promise<Track[] | null> {
        logger.info("Resolving YouTube playlist by URL", { url, maxItems });
        const playlistId = this.extractPlaylistId(url);
        if (!playlistId || maxItems <= 0) {
            logger.debug("Playlist URL was not valid or maxItems <= 0", {
                url,
                maxItems,
                playlistId
            });
            return null;
        }

        const limitedMax = Math.min(maxItems, 200);
        const videoIds: string[] = [];
        let pageToken: string | undefined;

        while (videoIds.length < limitedMax) {
            const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
            playlistUrl.searchParams.set("part", "snippet");
            playlistUrl.searchParams.set("playlistId", playlistId);
            playlistUrl.searchParams.set("maxResults", String(Math.min(50, limitedMax - videoIds.length)));
            playlistUrl.searchParams.set("key", this.apiKey);
            if (pageToken) {
                playlistUrl.searchParams.set("pageToken", pageToken);
            }

            const playlistResponse = await fetch(playlistUrl);
            if (!playlistResponse.ok) {
                logger.error("YouTube playlist lookup failed", {
                    status: playlistResponse.status,
                    playlistId,
                    accumulatedIds: videoIds.length
                });
                throw new Error(`YouTube playlist lookup failed (${playlistResponse.status})`);
            }

            const playlistJson = (await playlistResponse.json()) as YoutubePlaylistItemsResponse;
            const pageIds = playlistJson.items
                .map((item) => item.snippet?.resourceId?.videoId)
                .filter((id): id is string => typeof id === "string" && id.length > 0);

            videoIds.push(...pageIds);
            pageToken = playlistJson.nextPageToken;

            if (!pageToken || pageIds.length === 0) {
                break;
            }
        }

        if (videoIds.length === 0) {
            logger.info("Playlist resolved but had no videos", { playlistId, url });
            return [];
        }

        const uniqueIds = [...new Set(videoIds)].slice(0, limitedMax);
        const tracks: Track[] = [];

        for (let index = 0; index < uniqueIds.length; index += 50) {
            const batch = uniqueIds.slice(index, index + 50);
            const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
            detailsUrl.searchParams.set("part", "snippet,contentDetails");
            detailsUrl.searchParams.set("id", batch.join(","));
            detailsUrl.searchParams.set("key", this.apiKey);

            const detailsResponse = await fetch(detailsUrl);
            if (!detailsResponse.ok) {
                logger.error("YouTube video batch lookup failed", {
                    status: detailsResponse.status,
                    playlistId,
                    batchSize: batch.length
                });
                throw new Error(`YouTube video batch lookup failed (${detailsResponse.status})`);
            }

            const detailsJson = (await detailsResponse.json()) as YoutubeVideosResponse;
            tracks.push(
                ...detailsJson.items.map((item) => ({
                    id: item.id,
                    title: item.snippet.title,
                    url: `https://www.youtube.com/watch?v=${item.id}`,
                    durationSeconds: parseIsoDuration(item.contentDetails?.duration),
                    source: "youtube" as const,
                    thumbnailUrl: getThumbnail(item)
                }))
            );
        }

        const order = new Map(uniqueIds.map((id, idx) => [id, idx]));
        tracks.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        const limitedTracks = tracks.slice(0, limitedMax);
        logger.info("Playlist resolved into tracks", {
            playlistId,
            count: limitedTracks.length
        });

        return limitedTracks;
    }

    private extractVideoId(input: string): string | null {
        try {
            const url = new URL(input);

            if (url.hostname === "youtu.be") {
                return url.pathname.slice(1) || null;
            }

            if (url.hostname.includes("youtube.com")) {
                return url.searchParams.get("v");
            }

            return null;
        } catch {
            return null;
        }
    }

    private extractPlaylistId(input: string): string | null {
        try {
            const url = new URL(input);
            if (!url.hostname.includes("youtube.com")) {
                return null;
            }

            return url.searchParams.get("list");
        } catch {
            return null;
        }
    }
}
