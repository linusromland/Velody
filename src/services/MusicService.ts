import { GuildMember, type ChatInputCommandInteraction } from "discord.js";

import type { QueueItem, Track } from "../core/types";
import type { GuildPlaybackManager } from "../core/playback/GuildPlaybackManager";
import type { SearchProvider } from "../providers/interfaces";
import { createLogger } from "../utils/logger";

const logger = createLogger("MusicService");

export interface EmbedResponse {
    title: string;
    description: string;
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
                return {
                    title: "Playlist Queued",
                    description: `Queued **${queueItems.length}** tracks.\nFirst up: **${firstTrack?.title ?? "unknown"}**`,
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
            title: "Track Queued",
            description: `Added **${track.title}** to the queue.`,
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
                description: "Nothing is currently playing."
            };
        }

        logger.info("Track skipped", {
            guildId,
            trackId: skipped.track.id,
            title: skipped.track.title,
            userId: interaction.user.id
        });

        return {
            title: "Track Skipped",
            description: `Skipped **${skipped.track.title}**.`,
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
                description: "Queue is empty."
            };
        }

        const nowLine = state.nowPlaying
            ? `Now playing: ${state.nowPlaying.track.title}`
            : "Now playing: nothing";

        const queuedLines = state.queue.slice(0, 10).map((item, index) => `${index + 1}. ${item.track.title}`);

        if (state.queue.length > 10) {
            queuedLines.push(`...and ${state.queue.length - 10} more`);
        }

        return {
            title: "Queue",
            description: [nowLine, ...queuedLines].join("\n"),
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
                description: "Nothing is currently playing."
            };
        }

        return {
            title: "Now Playing",
            description: `**${state.nowPlaying.track.title}**`,
            thumbnailUrl: state.nowPlaying.track.thumbnailUrl ?? undefined,
            footer: `Requested by ${state.nowPlaying.requestedBy}`
        };
    }
}
