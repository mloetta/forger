import { createLogger, createRestManager } from 'discordeno';
import { BOT_TOKEN } from 'core/variables';
import { setupRestAnalyticsHooks } from './influx';

export const logger = createLogger({ name: 'REST' });

export const rest = createRestManager({ token: BOT_TOKEN });

setupRestAnalyticsHooks(rest, logger);
