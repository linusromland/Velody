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

export class YtDlpExtractionProvider implements AudioExtractionProvider {
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
        const attempts: ExtractionAttempt[] = [
            { name: "default", extraArgs: [] },
            {
                name: "cookies",
                extraArgs: this.options.cookiesFile
                    ? ["--cookies", this.options.cookiesFile]
                    : []
            },
            {
                name: "proxy",
                extraArgs: this.options.proxy ? ["--proxy", this.options.proxy] : []
            }
        ].filter((attempt) => attempt.extraArgs.length > 0 || attempt.name === "default");

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

        const outputTemplate = path.join(cacheDir, "%(id)s.%(ext)s");
        const args = [
            "--no-playlist",
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
            ...this.getOptionalArgs(),
            track.url
        ];

        const output = await this.exec(this.options.ytDlpPath, args);
        const lines = output
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        const filePath = lines[lines.length - 1];
        if (!filePath) {
            logger.error("yt-dlp did not return file path after download", {
                trackId: track.id,
                cacheDir
            });
            throw new Error("yt-dlp did not return a cached file path");
        }

        logger.info("Downloaded track to cache", {
            trackId: track.id,
            filePath
        });

        return filePath;
    }

    private getOptionalArgs(): string[] {
        const args: string[] = [];

        if (this.options.cookiesFile) {
            args.push("--cookies", this.options.cookiesFile);
        }

        if (this.options.proxy) {
            args.push("--proxy", this.options.proxy);
        }

        return args;
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
