import { REST, Routes } from "discord.js";

import { commandDefinitions } from "./commands/definitions";
import { createLogger } from "./utils/logger";

const logger = createLogger("registerCommands");

export const registerGlobalCommands = async (
    token: string,
    clientId: string
): Promise<void> => {
    logger.info("Registering global slash commands", {
        clientId,
        commandCount: commandDefinitions.length
    });

    const rest = new REST({ version: "10" }).setToken(token);
    await rest.put(Routes.applicationCommands(clientId), {
        body: commandDefinitions
    });

    logger.info("Global slash commands registered successfully", {
        clientId,
        commandCount: commandDefinitions.length
    });
};
