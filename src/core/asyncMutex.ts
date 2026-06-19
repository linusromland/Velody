import { createLogger } from "../utils/logger";

const logger = createLogger("AsyncMutex");

export class AsyncMutex {
    private lockPromise: Promise<void> = Promise.resolve();

    public async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
        logger.debug("Waiting for mutex lock");
        const priorLock = this.lockPromise;
        let release!: () => void;
        this.lockPromise = new Promise<void>((resolve) => {
            release = resolve;
        });

        await priorLock;
        logger.debug("Mutex lock acquired");

        try {
            return await operation();
        } finally {
            logger.debug("Releasing mutex lock");
            release();
        }
    }
}
