import { GuildMember, type ChatInputCommandInteraction } from "discord.js";

import type { QueueItem, Track } from "../core/types";
import type { GuildPlaybackManager } from "../core/playback/GuildPlaybackManager";
import type { SearchProvider } from "../providers/interfaces";
import { createLogger } from "../utils/logger";

const logger = createLogger("MusicService");

export interface EmbedResponse {
    title: string;
    description: string;
    url?: string | undefined;
    color?: number;
    thumbnailUrl?: string | undefined;
    imageUrl?: string | undefined;
    footer?: string | undefined;
}

const formatDuration = (durationSeconds: number | null): string => {
    if (durationSeconds === null) {
        return "Unknown length";
    }

    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
};

const isLikelyUrl = (input: string): boolean => {
    try {
        const parsed = new URL(input);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
};

export class MusicService {
    public constructor(
        private readonly searchProvider: SearchProvider,
        private readonly playbackManager: GuildPlaybackManager,
        private readonly playlistMaxItems: number
    ) { }

    public async play(interaction: ChatInputCommandInteraction): Promise<EmbedResponse> {
        const guildId = interaction.guildId;
        if (!guildId || !interaction.guild) {
            logger.warn("Play command rejected outside guild", {
                userId: interaction.user.id
            });
            throw new Error("This command can only be used in a server.");
        }

        const member = interaction.member;
        if (!member || !(member instanceof GuildMember)) {
            logger.warn("Play command missing guild member", {
                guildId,
                userId: interaction.user.id
            });
            throw new Error("Could not resolve your guild member data.");
        }

        const query = interaction.options.getString("query", true).trim();
        logger.info("Processing play command", {
            guildId,
            userId: interaction.user.id,
            query
        });

        if (isLikelyUrl(query)) {
            logger.debug("Play query detected as URL, checking playlist", {
                guildId,
                query
            });
            const playlistTracks = await this.searchProvider.getPlaylistByUrl(
                query,
                this.playlistMaxItems
            );

            if (playlistTracks && playlistTracks.length > 0) {
                logger.info("Playlist resolved", {
                    guildId,
                    count: playlistTracks.length
                });
                const queueItems: QueueItem[] = playlistTracks.map((track) => ({
                    track,
                    requestedBy: interaction.user.tag,
                    requestedAt: new Date()
                }));

                for (const queueItem of queueItems) {
                    await this.playbackManager.enqueue(guildId, member, queueItem);
                }

                logger.info("Playlist enqueued", {
                    guildId,
                    count: queueItems.length,
                    firstTrack: queueItems[0]?.track.title
                });

                const firstTrack = queueItems[0]?.track;
                const previewLines = queueItems
                    .slice(0, 5)
                    .map((item, index) => `${index + 1}. ${item.track.title}`);

                if (queueItems.length > 5) {
                    previewLines.push(`...and ${queueItems.length - 5} more`);
                }

                return {
                    title: "Playlist Added",
                    description: [
                        `Added **${queueItems.length} songs** to the queue.`,
                        "",
                        "**First up**",
                        firstTrack ? `**${firstTrack.title}**` : "Unknown track",
                        "",
                        "**Queue preview**",
                        ...previewLines
                    ].join("\n"),
                    color: 0x1db954,
                    imageUrl: firstTrack?.thumbnailUrl ?? undefined
                };
            }
        }

        let track: Track | null = null;
        if (isLikelyUrl(query)) {
            logger.debug("Resolving single track by URL", { guildId, query });
            track = await this.searchProvider.getByUrl(query);
        } else {
            logger.debug("Resolving single track by search", { guildId, query });
            const matches = await this.searchProvider.search(query);
            track = matches[0] ?? null;
        }

        if (!track) {
            logger.warn("No track found for play command", {
                guildId,
                query,
                userId: interaction.user.id
            });
            throw new Error("No track found for that query.");
        }

        const queueItem: QueueItem = {
            track,
            requestedBy: interaction.user.tag,
            requestedAt: new Date()
        };
        const firstSong = !this.playbackManager.getState(guildId).isPlaying;

        await this.playbackManager.enqueue(guildId, member, queueItem);
        logger.info("Track enqueued", {
            guildId,
            trackId: track.id,
            title: track.title,
            userId: interaction.user.id
        });


        return {
            title: `🎶 **${track.title}**`,
            url: track.url,
            description: [
                firstSong ? `Playing now!` : "Track Queued.",
                '',
                `Duration: ** ${formatDuration(track.durationSeconds)}**`
            ].join("\n"),
            color: 0x1db954,
            thumbnailUrl: track.thumbnailUrl ?? undefined
        };
    }

    public async skip(interaction: ChatInputCommandInteraction): Promise<EmbedResponse> {
        const guildId = interaction.guildId;
        if (!guildId) {
            logger.warn("Skip command rejected outside guild", {
                userId: interaction.user.id
            });
            throw new Error("This command can only be used in a server.");
        }

        logger.info("Processing skip command", {
            guildId,
            userId: interaction.user.id
        });

        const stateBeforeSkip = this.playbackManager.getState(guildId);
        const nextTrack = stateBeforeSkip.queue[0]?.track ?? null;
        const skipped = await this.playbackManager.skip(guildId);
        if (!skipped) {
            logger.info("Skip command had no active track", { guildId });
            return {
                title: "Nothing To Skip",
                description: [
                    "No track is currently playing.",
                    "",
                    "Use /play to start listening."
                ].join("\n"),
                color: 0xf1c40f
            };
        }

        logger.info("Track skipped", {
            guildId,
            trackId: skipped.track.id,
            title: skipped.track.title,
            userId: interaction.user.id
        });

        return {
            title: "Skipped",
            description: [
                `Skipped: **${skipped.track.title}**`,
                `Duration: **${formatDuration(skipped.track.durationSeconds)}**`,
                "",
                nextTrack
                    ? `Next up: **${nextTrack.title}**`
                    : "Next up: Nothing in queue"
            ].join("\n"),
            color: 0xf1c40f,
            thumbnailUrl: nextTrack?.thumbnailUrl ?? skipped.track.thumbnailUrl ?? undefined
        };
    }

    public async leave(interaction: ChatInputCommandInteraction): Promise<EmbedResponse> {
        const guildId = interaction.guildId;
        if (!guildId) {
            logger.warn("Leave command rejected outside guild", {
                userId: interaction.user.id
            });
            throw new Error("This command can only be used in a server.");
        }

        logger.info("Processing leave command", {
            guildId,
            userId: interaction.user.id
        });
        await this.playbackManager.leave(guildId);
        logger.info("Leave command completed", { guildId, userId: interaction.user.id });
        return {
            title: "Disconnected",
            description: "Disconnected from voice and cleared the queue.",
            color: 0xe67e22
        };
    }

    public queue(interaction: ChatInputCommandInteraction): EmbedResponse {
        const guildId = interaction.guildId;
        if (!guildId) {
            logger.warn("Queue command rejected outside guild", {
                userId: interaction.user.id
            });
            throw new Error("This command can only be used in a server.");
        }

        const state = this.playbackManager.getState(guildId);
        logger.debug("Queue state requested", {
            guildId,
            queueLength: state.queue.length,
            hasNowPlaying: Boolean(state.nowPlaying)
        });

        if (!state.nowPlaying && state.queue.length === 0) {
            return {
                title: "Queue",
                description: [
                    "Queue is empty.",
                    "",
                    "Use /play to add your next song."
                ].join("\n"),
                color: 0x5865f2
            };
        }

        const nowPlayingTrack = state.nowPlaying?.track ?? null;
        const queuedPreview = state.queue.slice(0, 8);
        const queuedLines = queuedPreview.map((item, index) => {
            const title = truncateText(item.track.title, 58);
            const duration = formatDuration(item.track.durationSeconds);
            return `${index + 1}. ${title}  (${duration})`;
        });

        if (state.queue.length > queuedPreview.length) {
            queuedLines.push(`...and ${state.queue.length - queuedPreview.length} more`);
        }

        return {
            title: "Queue",
            description: [
                "**Now Playing**",
                nowPlayingTrack
                    ? `• **${truncateText(nowPlayingTrack.title, 64)}**`
                    : "• Nothing right now",
                nowPlayingTrack
                    ? `• Duration: **${formatDuration(nowPlayingTrack.durationSeconds)}**`
                    : null,
                "",
                "",
                "",
                `**Up Next (${state.queue.length})**`,
                ...(queuedLines.length > 0 ? queuedLines : ["No upcoming tracks"])
            ].filter((line): line is string => Boolean(line)).join("\n"),
            color: 0x5865f2,
            thumbnailUrl: state.nowPlaying?.track.thumbnailUrl ?? undefined,
            footer: `Queue size: ${state.queue.length}`
        };
    }

    public nowPlaying(interaction: ChatInputCommandInteraction): EmbedResponse {
        const guildId = interaction.guildId;
        if (!guildId) {
            logger.warn("Now-playing command rejected outside guild", {
                userId: interaction.user.id
            });
            throw new Error("This command can only be used in a server.");
        }

        const state = this.playbackManager.getState(guildId);
        logger.debug("Now-playing requested", {
            guildId,
            hasNowPlaying: Boolean(state.nowPlaying)
        });
        if (!state.nowPlaying) {
            return {
                title: "Now Playing",
                description: [
                    "Nothing is playing right now.",
                    "",
                    "Use /play to start the queue."
                ].join("\n"),
                color: 0x5865f2
            };
        }

        return {
            title: "Now Playing",
            description: [
                `**${state.nowPlaying.track.title}**`,
                "",
                `Duration: **${formatDuration(state.nowPlaying.track.durationSeconds)}**`,
                state.queue[0]
                    ? `Next up: **${state.queue[0].track.title}**`
                    : "Next up: Nothing in queue"
            ].join("\n"),
            color: 0x5865f2,
            thumbnailUrl: state.nowPlaying.track.thumbnailUrl ?? undefined
        };
    }
}
