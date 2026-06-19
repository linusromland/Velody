type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
};

const parseLogLevel = (value: string | undefined): LogLevel => {
    if (value === "debug" || value === "info" || value === "warn" || value === "error") {
        return value;
    }

    return "info";
};

const baseLevel = parseLogLevel(process.env.LOG_LEVEL);

const normalizeMeta = (meta: unknown): unknown => {
    if (meta instanceof Error) {
        return {
            name: meta.name,
            message: meta.message,
            stack: meta.stack
        };
    }

    return meta;
};

export class Logger {
    public constructor(private readonly scope: string) { }

    public debug(message: string, meta?: unknown): void {
        this.log("debug", message, meta);
    }

    public info(message: string, meta?: unknown): void {
        this.log("info", message, meta);
    }

    public warn(message: string, meta?: unknown): void {
        this.log("warn", message, meta);
    }

    public error(message: string, meta?: unknown): void {
        this.log("error", message, meta);
    }

    private log(level: LogLevel, message: string, meta?: unknown): void {
        if (levelWeight[level] < levelWeight[baseLevel]) {
            return;
        }

        const payload: Record<string, unknown> = {
            timestamp: new Date().toISOString(),
            level,
            scope: this.scope,
            message
        };

        if (meta !== undefined) {
            payload.meta = normalizeMeta(meta);
        }

        process.stdout.write(`${JSON.stringify(payload)}\n`);
    }
}

export const createLogger = (scope: string): Logger => {
    return new Logger(scope);
};
