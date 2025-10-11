import { createLogger, createRestManager } from "discordeno";
import { TOKEN } from "utils/variables";
import { bot } from "./bot";

const rest = createRestManager({ token: TOKEN });
const logger = createLogger({ name: "Application Commands" });

logger.info("Refreshing application (/) commands");

await rest.upsertGlobalApplicationCommands(bot.commands.array());

logger.info("Successfully reloaded application (/) commands");

process.exit();
