import { bot } from 'bot/bot';
import type { Event } from 'helpers/event';

export default {
  name: 'ready',
  run({ shardId }) {
    bot.logger.info(`Shard ID #${shardId} is ready.`);
  },
} satisfies Event<'ready'>;
