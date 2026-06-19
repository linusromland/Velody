import { MongoClient } from "mongodb";
import { createLogger } from "../../utils/logger";

const logger = createLogger("mongoClient");

export const connectMongo = async (
    uri: string,
    dbName: string
): Promise<{ client: MongoClient; dbName: string }> => {
    logger.info("Connecting to MongoDB", {
        dbName,
        uriHost: new URL(uri).host
    });

    const client = new MongoClient(uri);
    await client.connect();
    logger.info("MongoDB connection established", { dbName });
    return { client, dbName };
};
