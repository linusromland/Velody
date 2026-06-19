import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().min(1),
    MONGODB_URI: z.string().url(),
    MONGODB_DB_NAME: z.string().min(1).default("velody"),
    YOUTUBE_API_KEY: z.string().min(1),
    YTDLP_PATH: z.string().min(1).default("yt-dlp"),
    FFMPEG_PATH: z.string().min(1).default("ffmpeg"),
    YTDLP_COOKIES_FILE: z.string().min(1).optional(),
    YTDLP_PROXY: z.string().min(1).optional(),
    CACHE_DIR: z.string().min(1).default(".cache/audio"),
    PREFETCH_COUNT: z.coerce.number().int().min(0).max(10).default(2),
    PREFETCH_CONCURRENCY: z.coerce.number().int().min(1).max(5).default(2),
    DOWNLOAD_CACHE_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(72),
    PLAYLIST_MAX_ITEMS: z.coerce.number().int().min(1).max(200).default(50),
    MAX_QUEUE_SIZE: z.coerce.number().int().min(1).max(1000).default(100)
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
