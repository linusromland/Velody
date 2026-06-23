import path from "node:path";

import {
    AttachmentBuilder,
    EmbedBuilder,
    type ChatInputCommandInteraction
} from "discord.js";

import type { MusicService } from "../services/MusicService";
import type { EmbedResponse } from "../services/MusicService";
import { createLogger } from "../utils/logger";

const logger = createLogger("handleInteraction");
const LOGO_FILENAME = "logo.jpeg";
const LOGO_FILE_PATH = path.resolve(process.cwd(), "assets", LOGO_FILENAME);

const buildEmbed = (payload: EmbedResponse): EmbedBuilder => {
    const embed = new EmbedBuilder()
        .setColor(payload.color ?? 0x2f3136)
        .setAuthor({ name: "Velody", iconURL: `attachment://${LOGO_FILENAME}` })
        .setTitle(payload.title)
        .setDescription(payload.description);

    if (payload.url) {
        embed.setURL(payload.url);
    }

    if (payload.thumbnailUrl) {
        embed.setThumbnail(payload.thumbnailUrl);
    }

    if (payload.imageUrl) {
        embed.setImage(payload.imageUrl);
    }

    if (payload.footer) {
        embed.setFooter({ text: payload.footer });
    }

    return embed;
};

const sendEmbedReply = async (
    interaction: ChatInputCommandInteraction,
    payload: EmbedResponse
): Promise<void> => {
    await interaction.editReply({
        embeds: [buildEmbed(payload)],
        files: [new AttachmentBuilder(LOGO_FILE_PATH, { name: LOGO_FILENAME })]
    });
};

export const handleInteraction = async (
    interaction: ChatInputCommandInteraction,
    musicService: MusicService
): Promise<void> => {
    logger.info("Dispatching command interaction", {
        commandName: interaction.commandName,
        guildId: interaction.guildId,
        userId: interaction.user.id
    });

    switch (interaction.commandName) {
        case "play": {
            const message = await musicService.play(interaction);
            await sendEmbedReply(interaction, message);
            logger.info("Handled play command", {
                guildId: interaction.guildId,
                userId: interaction.user.id
            });
            return;
        }

        case "skip": {
            const message = await musicService.skip(interaction);
            await sendEmbedReply(interaction, message);
            logger.info("Handled skip command", {
                guildId: interaction.guildId,
                userId: interaction.user.id
            });
            return;
        }

        case "queue": {
            const message = musicService.queue(interaction);
            await sendEmbedReply(interaction, message);
            logger.info("Handled queue command", {
                guildId: interaction.guildId,
                userId: interaction.user.id
            });
            return;
        }

        case "now-playing": {
            const message = musicService.nowPlaying(interaction);
            await sendEmbedReply(interaction, message);
            logger.info("Handled now-playing command", {
                guildId: interaction.guildId,
                userId: interaction.user.id
            });
            return;
        }

        case "leave": {
            const message = await musicService.leave(interaction);
            await sendEmbedReply(interaction, message);
            logger.info("Handled leave command", {
                guildId: interaction.guildId,
                userId: interaction.user.id
            });
            return;
        }

        default: {
            logger.warn("Received unknown command", {
                commandName: interaction.commandName,
                guildId: interaction.guildId,
                userId: interaction.user.id
            });
            await sendEmbedReply(interaction, {
                title: "Unknown Command",
                description: "That command is not supported by this bot."
            });
        }
    }
};
