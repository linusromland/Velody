import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { ExtractionResult, Track } from "../../core/types";
import type { AudioExtractionProvider } from "../interfaces";
import { createLogger } from "../../utils/logger";

const logger = createLogger("YtDlpExtractionProvider");

export interface YtDlpExtractionOptions {
    ytDlpPath: string;
    cookiesFile?: string;
    proxy?: string;
}

interface ExtractionAttempt {
    name: string;
    extraArgs: string[];
}

interface YtClientProfile {
    name: string;
    args: string[];
}

export class YtDlpExtractionProvider implements AudioExtractionProvider {
    private static readonly YT_CLIENT_PROFILES: YtClientProfile[] = [
        { name: "default-client", args: [] },
        {
            name: "android-client",
            args: ["--extractor-args", "youtube:player_client=android"]
        },
        {
            name: "ios-client",
            args: ["--extractor-args", "youtube:player_client=ios"]
        },
        {
            name: "tv-client",
            args: ["--extractor-args", "youtube:player_client=tv"]
        }
    ];

    public constructor(private readonly options: YtDlpExtractionOptions) {
        logger.info("Initialized yt-dlp provider", {
            ytDlpPath: this.options.ytDlpPath,
            hasCookies: Boolean(this.options.cookiesFile),
            hasProxy: Boolean(this.options.proxy)
        });
    }

    public async extract(track: Track): Promise<ExtractionResult> {
        logger.info("Extracting stream URL", {
            trackId: track.id,
            title: track.title
        });
        const attempts = this.buildAttempts();

        let lastError: Error | null = null;

        for (const attempt of attempts) {
            try {
                logger.debug("Running extraction attempt", {
                    trackId: track.id,
                    attempt: attempt.name
                });
                const streamUrl = await this.extractWithAttempt(track.url, attempt.extraArgs);
                logger.info("Extraction succeeded", {
                    trackId: track.id,
                    attempt: attempt.name
                });
                return {
                    streamUrl,
                    // Direct URLs usually remain valid for hours; refresh before reuse if close to expiry.
                    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
                };
            } catch (error) {
                logger.warn("Extraction attempt failed", {
                    trackId: track.id,
                    attempt: attempt.name,
                    error
                });
                lastError =
                    error instanceof Error
                        ? error
                        : new Error(`Unknown yt-dlp error on ${attempt.name} attempt`);
            }
        }

        logger.error("All extraction attempts failed", {
            trackId: track.id,
            error: lastError
        });
        throw lastError ?? new Error("yt-dlp extraction failed");
    }

    private async extractWithAttempt(url: string, extraArgs: string[]): Promise<string> {
        const args = [
            "--no-playlist",
            "--no-update",
            "--extractor-retries",
            "3",
            "--format",
            "bestaudio/best",
            "--get-url",
            ...extraArgs,
            url
        ];

        const output = await this.exec(this.options.ytDlpPath, args);
        const streamUrl = output.trim().split("\n")[0];

        if (!streamUrl || !/^https?:\/\//.test(streamUrl)) {
            throw new Error("yt-dlp returned an invalid stream url");
        }

        return streamUrl;
    }

    public async downloadToCache(track: Track, cacheDir: string): Promise<string> {
        logger.info("Downloading track to cache", {
            trackId: track.id,
            title: track.title,
            cacheDir
        });
        await mkdir(cacheDir, { recursive: true });

        const attempts = this.buildAttempts();
        let lastError: Error | null = null;

        for (const attempt of attempts) {
            try {
                logger.debug("Running cache download attempt", {
                    trackId: track.id,
                    attempt: attempt.name
                });
                const filePath = await this.downloadWithAttempt(track.url, cacheDir, attempt.extraArgs);
                logger.info("Downloaded track to cache", {
                    trackId: track.id,
                    filePath,
                    attempt: attempt.name
                });
                return filePath;
            } catch (error) {
                logger.warn("Cache download attempt failed", {
                    trackId: track.id,
                    attempt: attempt.name,
                    error
                });
                lastError =
                    error instanceof Error
                        ? error
                        : new Error(`Unknown yt-dlp error on ${attempt.name} attempt`);
            }
        }

        logger.error("All cache download attempts failed", {
            trackId: track.id,
            error: lastError
        });
        throw lastError ?? new Error("yt-dlp cache download failed");
    }

    private async downloadWithAttempt(
        url: string,
        cacheDir: string,
        extraArgs: string[]
    ): Promise<string> {
        const outputTemplate = path.join(cacheDir, "%(id)s.%(ext)s");
        const args = [
            "--no-playlist",
            "--no-update",
            "--extractor-retries",
            "3",
            "--format",
            "bestaudio/best",
            "-x",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "0",
            "--print",
            "after_move:filepath",
            "-o",
            outputTemplate,
            ...extraArgs,
            url
        ];

        const output = await this.exec(this.options.ytDlpPath, args);
        const lines = output
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        const filePath = lines[lines.length - 1];
        if (!filePath) {
            throw new Error("yt-dlp did not return a cached file path");
        }

        return filePath;
    }

    private buildAttempts(): ExtractionAttempt[] {
        const authVariants = this.getAuthVariants();
        const attempts: ExtractionAttempt[] = [];

        for (const authVariant of authVariants) {
            for (const profile of YtDlpExtractionProvider.YT_CLIENT_PROFILES) {
                attempts.push({
                    name: `${authVariant.name}+${profile.name}`,
                    extraArgs: [...authVariant.extraArgs, ...profile.args]
                });
            }
        }

        return attempts;
    }

    private getAuthVariants(): ExtractionAttempt[] {
        const variants: ExtractionAttempt[] = [{ name: "base", extraArgs: [] }];

        if (this.options.cookiesFile) {
            variants.push({
                name: "cookies",
                extraArgs: ["--cookies", this.options.cookiesFile]
            });
        }

        if (this.options.proxy) {
            variants.push({
                name: "proxy",
                extraArgs: ["--proxy", this.options.proxy]
            });
        }

        if (this.options.cookiesFile && this.options.proxy) {
            variants.push({
                name: "cookies-proxy",
                extraArgs: [
                    "--cookies",
                    this.options.cookiesFile,
                    "--proxy",
                    this.options.proxy
                ]
            });
        }

        return variants;
    }

    private async exec(command: string, args: string[]): Promise<string> {
        logger.debug("Spawning process", {
            command,
            args
        });
        return new Promise<string>((resolve, reject) => {
            const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";

            child.stdout.on("data", (chunk: Buffer) => {
                stdout += chunk.toString("utf8");
            });

            child.stderr.on("data", (chunk: Buffer) => {
                stderr += chunk.toString("utf8");
            });

            child.on("error", (error) => {
                logger.error("Process spawn failed", {
                    command,
                    error
                });
                reject(error);
            });

            child.on("close", (code) => {
                if (code === 0) {
                    logger.debug("Process completed successfully", {
                        command,
                        exitCode: code
                    });
                    resolve(stdout);
                    return;
                }

                logger.error("Process exited with failure", {
                    command,
                    exitCode: code,
                    stderr
                });
                reject(new Error(`Command failed (${code}): ${stderr.trim()}`));
            });
        });
    }
}
