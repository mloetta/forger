import { createLogger, createRestManager } from 'discordeno';
import { TOKEN } from 'core/variables';
import { setupRestAnalyticsHooks } from './influx';

export const logger = createLogger({ name: 'REST' });

export const rest = createRestManager({ token: TOKEN });

setupRestAnalyticsHooks(rest, logger);
