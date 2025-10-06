import { createLogger } from 'discordeno';
import createEvent from 'helpers/event';

const logger = createLogger({ name: 'ready' });

createEvent({
  name: 'ready',
  run({ shardId }) {
    logger.info(`Shard ID #${shardId} is ready.`);
  },
});
