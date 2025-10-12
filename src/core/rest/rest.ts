import { createLogger, createRestManager } from 'discordeno';
import { TOKEN } from 'utils/variables';

export const logger = createLogger({ name: 'REST' });

export const rest = createRestManager({ token: TOKEN });
