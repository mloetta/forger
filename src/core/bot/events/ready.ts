import { bot } from 'bot/bot';
import { ActivityTypes, Collection, createLogger, GatewayOpcodes } from 'discordeno';
import createEvent from 'helpers/event';

const readyHandlers = new Collection<string, (payload: any) => Promise<void>>();

const logger = createLogger({ name: 'ready' });

createEvent({
  name: 'ready',
  run(payload) {
    logger.info(`Shard ID #${payload.shardId} is ready.`);

    for (const handler of readyHandlers.values()) {
      handler(payload);
    }
  },
});

readyHandlers.set('shardPresence', async (payload) => {
  bot.gateway.sendPayload(payload.shardId, {
    op: GatewayOpcodes.PresenceUpdate,
    d: {
      status: 'online',
      since: null,
      afk: false,
      activities: [
        {
          type: ActivityTypes.Custom,
          name: 'Per shard status',
          state: `You're on shard #${payload.shardId}!`,
        },
      ],
    },
  });
});
