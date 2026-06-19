import { GuildMember, type ChatInputCommandInteraction } from "discord.js";

import type { QueueItem, Track } from "../core/types";
import type { GuildPlaybackManager } from "../core/playback/GuildPlaybackManager";
import type { SearchProvider } from "../providers/interfaces";
import { createLogger } from "../utils/logger";

const logger = createLogger("MusicService");

export interface EmbedResponse {
    title: string;
    description: string;
    color?: number;
    thumbnailUrl?: string | undefined;
    footer?: string | undefined;
}

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
                        `Added **${queueItems.length}** tracks to the queue.`,
                        "",
                        "**Up Next**",
                        ...previewLines
                    ].join("\n"),
                    color: 0x1db954,
                    thumbnailUrl: firstTrack?.thumbnailUrl ?? undefined,
                    footer: `Requested by ${interaction.user.tag}`
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

        await this.playbackManager.enqueue(guildId, member, queueItem);
        logger.info("Track enqueued", {
            guildId,
            trackId: track.id,
            title: track.title,
            userId: interaction.user.id
        });

        return {
            title: "Track Added",
            description: [
                `**${track.title}**`,
                "",
                "Added to the queue."
            ].join("\n"),
            color: 0x1db954,
            thumbnailUrl: track.thumbnailUrl ?? undefined,
            footer: `Requested by ${interaction.user.tag}`
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

        const skipped = await this.playbackManager.skip(guildId);
        if (!skipped) {
            logger.info("Skip command had no active track", { guildId });
            return {
                title: "Skip",
                description: "Nothing is playing right now.",
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
            description: `Skipped **${skipped.track.title}**.`,
            color: 0xf1c40f,
            thumbnailUrl: skipped.track.thumbnailUrl ?? undefined,
            footer: `Requested by ${interaction.user.tag}`
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
            description: "Left the voice channel and cleared the queue.",
            color: 0xe67e22,
            footer: `Requested by ${interaction.user.tag}`
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
                description: "No tracks queued yet.",
                color: 0x5865f2
            };
        }

        const nowLine = state.nowPlaying
            ? `• ${state.nowPlaying.track.title}`
            : "• Nothing right now";

        const queuedLines = state.queue
            .slice(0, 10)
            .map((item, index) => `${index + 1}. ${item.track.title}`);

        if (state.queue.length > 10) {
            queuedLines.push(`...and ${state.queue.length - 10} more`);
        }

        return {
            title: "Queue",
            description: [
                "**Now Playing**",
                nowLine,
                "",
                "**Up Next**",
                ...(queuedLines.length > 0 ? queuedLines : ["No upcoming tracks"])
            ].join("\n"),
            color: 0x5865f2,
            thumbnailUrl: state.nowPlaying?.track.thumbnailUrl ?? undefined,
            footer: `Total queued: ${state.queue.length}`
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
                description: "Nothing is playing right now.",
                color: 0x5865f2
            };
        }

        return {
            title: "Now Playing",
            description: [
                `**${state.nowPlaying.track.title}**`,
                "",
                "Use /queue to see what is coming up."
            ].join("\n"),
            color: 0x5865f2,
            thumbnailUrl: state.nowPlaying.track.thumbnailUrl ?? undefined,
            footer: `Requested by ${state.nowPlaying.requestedBy}`
        };
    }
}
