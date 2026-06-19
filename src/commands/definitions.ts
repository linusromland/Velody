import { SlashCommandBuilder } from "discord.js";

export const commandDefinitions = [
    new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a track from YouTube")
        .addStringOption((option) =>
            option.setName("query").setDescription("URL or search text").setRequired(true)
        ),
    new SlashCommandBuilder().setName("skip").setDescription("Skip the current track"),
    new SlashCommandBuilder().setName("queue").setDescription("Show the current queue"),
    new SlashCommandBuilder()
        .setName("now-playing")
        .setDescription("Show the currently playing track"),
    new SlashCommandBuilder().setName("leave").setDescription("Disconnect and clear queue")
].map((command) => command.toJSON());
