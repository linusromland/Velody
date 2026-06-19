import { setDefaultResultOrder } from "node:dns";

import {
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    type ChatInputCommandInteraction
} from "discord.js";

import { env } from "./config/env";
import { handleInteraction } from "./commands/handleInteraction";
import { registerGlobalCommands } from "./registerCommands";
import { GuildPlaybackManager } from "./core/playback/GuildPlaybackManager";
import { connectMongo } from "./infrastructure/mongo/mongoClient";
import {
    CacheRepository,
    DownloadedMediaRepository,
    PlaybackHistoryRepository
} from "./infrastructure/mongo/repositories";
import { YoutubeSearchProvider } from "./providers/youtube/youtubeSearchProvider";
import { YtDlpExtractionProvider } from "./providers/youtube/ytDlpExtractionProvider";
import { MusicService } from "./services/MusicService";
import { PrefetchWorker } from "./core/prefetch/PrefetchWorker";
import { createLogger } from "./utils/logger";

const logger = createLogger("bootstrap");

const bootstrap = async (): Promise<void> => {
    setDefaultResultOrder("ipv4first");
    logger.info("Configured DNS result order", {
        order: "ipv4first"
    });

    logger.info("Starting Velody bootstrap", {
        logLevel: env.LOG_LEVEL,
        mongoDbName: env.MONGODB_DB_NAME,
        prefetchCount: env.PREFETCH_COUNT,
        prefetchConcurrency: env.PREFETCH_CONCURRENCY,
        playlistMaxItems: env.PLAYLIST_MAX_ITEMS
    });

    const mongo = await connectMongo(env.MONGODB_URI, env.MONGODB_DB_NAME);
    const db = mongo.client.db(mongo.dbName);

    const cacheRepository = new CacheRepository(db);
    const downloadedMediaRepository = new DownloadedMediaRepository(db);
    const historyRepository = new PlaybackHistoryRepository(db);
    await cacheRepository.init();
    await downloadedMediaRepository.init();
    await historyRepository.init();
    logger.info("Mongo repositories initialized");

    const searchProvider = new YoutubeSearchProvider(env.YOUTUBE_API_KEY);
    const extractionOptions = {
        ytDlpPath: env.YTDLP_PATH,
        ...(env.YTDLP_COOKIES_FILE ? { cookiesFile: env.YTDLP_COOKIES_FILE } : {}),
        ...(env.YTDLP_PROXY ? { proxy: env.YTDLP_PROXY } : {})
    };
    const extractionProvider = new YtDlpExtractionProvider(extractionOptions);
    logger.info("Providers initialized", {
        hasCookiesFallback: Boolean(env.YTDLP_COOKIES_FILE),
        hasProxyFallback: Boolean(env.YTDLP_PROXY)
    });

    const prefetchWorker = new PrefetchWorker(
        extractionProvider,
        downloadedMediaRepository,
        env.CACHE_DIR,
        env.PREFETCH_CONCURRENCY,
        env.DOWNLOAD_CACHE_TTL_HOURS
    );
    logger.info("Prefetch worker initialized", {
        cacheDir: env.CACHE_DIR,
        ttlHours: env.DOWNLOAD_CACHE_TTL_HOURS,
        concurrency: env.PREFETCH_CONCURRENCY
    });

    const playbackManager = new GuildPlaybackManager(
        extractionProvider,
        env.FFMPEG_PATH,
        cacheRepository,
        downloadedMediaRepository,
        historyRepository,
        prefetchWorker,
        env.PREFETCH_COUNT,
        env.MAX_QUEUE_SIZE
    );

    const musicService = new MusicService(
        searchProvider,
        playbackManager,
        env.PLAYLIST_MAX_ITEMS
    );

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessages
        ]
    });

    client.once(Events.ClientReady, async () => {
        logger.info("Discord client ready", {
            userTag: client.user?.tag,
            userId: client.user?.id
        });
        await registerGlobalCommands(env.DISCORD_TOKEN, env.DISCORD_CLIENT_ID);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        logger.debug("Received interaction", {
            commandName: interaction.commandName,
            guildId: interaction.guildId,
            userId: interaction.user.id
        });

        await interaction.deferReply();

        try {
            await handleInteraction(interaction as ChatInputCommandInteraction, musicService);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unexpected error";
            logger.error("Interaction handling failed", {
                commandName: interaction.commandName,
                guildId: interaction.guildId,
                userId: interaction.user.id,
                error
            });
            const errorEmbed = new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle("Command Failed")
                .setDescription(message)
                .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    });

    client.on(Events.Error, (error) => {
        logger.error("Discord client emitted error", error);
    });

    const shutdown = async (): Promise<void> => {
        logger.info("Shutdown requested");
        client.destroy();
        await mongo.client.close();
        logger.info("Shutdown complete");
        process.exit(0);
    };

    process.on("SIGINT", () => {
        logger.info("Received SIGINT signal");
        void shutdown();
    });

    process.on("SIGTERM", () => {
        logger.info("Received SIGTERM signal");
        void shutdown();
    });

    logger.info("Logging in Discord client");
    await client.login(env.DISCORD_TOKEN);
    logger.info("Discord login successful");
};

void bootstrap().catch((error) => {
    logger.error("Fatal bootstrap failure", error);
    process.exit(1);
});
