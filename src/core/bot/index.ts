import { type DiscordGatewayPayload, type GatewayDispatchEventNames } from 'discordeno';
import { BOT_SERVER_PORT } from 'core/variables';
import { bot } from './bot';
import { buildFastifyApp } from './fastify';
import 'utils/process';
import { readDirectory } from 'utils/utils';
import { join } from 'path';

interface GatewayEvent {
  payload: DiscordGatewayPayload;
  shardId: number;
}

// Import commands and events
await readDirectory(join(__dirname, 'events'));
await readDirectory(join(__dirname, 'commands'));

const app = await buildFastifyApp();

app.get('/timecheck', async (_req, res) => {
  res.status(200).send({ message: Date.now() });
});

app.post('/', async (req, res) => {
  const body = req.body as GatewayEvent;

  try {
    await handleGatewayEvent(body.payload, body.shardId);
    res.status(200).send();
  } catch (e) {
    bot.logger.error('There was an error handling the incoming gateway command', e);
    res.status(500).send();
  }
});

await app.listen({ host: app.config.host, port: Number(BOT_SERVER_PORT) });

bot.logger.info(`Bot event handler is listening on port ${BOT_SERVER_PORT}`);

async function handleGatewayEvent(payload: DiscordGatewayPayload, shardId: number): Promise<void> {
  bot.events.raw?.(payload, shardId);

  if (!payload.t) return;

  await bot.events.dispatchRequirements?.(payload, shardId);

  bot.handlers[payload.t as GatewayDispatchEventNames]?.(bot, payload, shardId);
}
