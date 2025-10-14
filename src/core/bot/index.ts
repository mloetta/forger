import type { DiscordGatewayPayload, GatewayDispatchEventNames } from 'discordeno';
import { connect as connectAmqp } from 'amqplib';
import {
  EVENT_SERVER_PORT,
  MESSAGEQUEUE_ENABLE,
  RABBITMQ_USERNAME,
  RABBITMQ_PASSWORD,
  RABBITMQ_URL,
} from 'utils/variables';
import { bot } from './bot';
import { buildFastifyApp } from './fastify';
import 'utils/process';
import { i18n } from 'utils/i18n';
import { readDirectory } from 'utils/utils';
import { join } from 'path';

interface GatewayEvent {
  payload: DiscordGatewayPayload;
  shardId: number;
}

// Import commands and events
await readDirectory(join(__dirname, './events'));
await readDirectory(join(__dirname, './commands'));

// Initialize i18n
await i18n();

if (MESSAGEQUEUE_ENABLE) {
  await connectToRabbitMQ();
}

const app = buildFastifyApp();

app.get('/timecheck', async (_req, res) => {
  res.status(200).send({ message: Date.now() });
});

app.post('/', async (req, res) => {
  const body = req.body as GatewayEvent;

  try {
    await handleGatewayEvent(body.payload, body.shardId);
    res.status(200).send();
  } catch (error) {
    bot.logger.error('There was an error handling the incoming gateway command', error);
    res.status(500).send();
  }
});

await app.listen({ port: Number(EVENT_SERVER_PORT) });

bot.logger.info(`Bot event handler is listening on port ${EVENT_SERVER_PORT}`);

async function handleGatewayEvent(payload: DiscordGatewayPayload, shardId: number): Promise<void> {
  bot.events.raw?.(payload, shardId);

  if (!payload.t) return;

  await bot.events.dispatchRequirements?.(payload, shardId);

  bot.handlers[payload.t as GatewayDispatchEventNames]?.(bot, payload, shardId);
}

async function connectToRabbitMQ(): Promise<void> {
  const connection = await connectAmqp(`amqp://${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}@${RABBITMQ_URL}`).catch(
    (error) => {
      bot.logger.error('Failed to connect to RabbitMQ, retrying in 1s.', error);
      setTimeout(connectToRabbitMQ, 1000);
    },
  );

  if (!connection) return;

  connection.on('close', () => {
    setTimeout(connectToRabbitMQ, 1000);
  });
  connection.on('error', (error) => {
    bot.logger.error('There was an error in the connection with RabbitMQ, reconnecting in 1s.', error);
    setTimeout(connectToRabbitMQ, 1000);
  });

  const channel = await connection.createChannel().catch((error) => {
    bot.logger.error('There was an error creating the RabbitMQ channel', error);
  });

  if (!channel) return;

  const exchange = await channel
    .assertExchange('gatewayMessage', 'x-message-deduplication', {
      durable: true,
      arguments: {
        'x-cache-size': 1000, // maximum number of entries
        'x-cache-ttl': 500, // 500ms
      },
    })
    .catch((error) => {
      bot.logger.error('There was an error asserting the exchange', error);
    });

  if (!exchange) return;

  await channel.assertQueue('gatewayMessageQueue').catch(bot.logger.error);
  await channel.bindQueue('gatewayMessageQueue', 'gatewayMessage', '').catch(bot.logger.error);
  await channel
    .consume('gatewayMessageQueue', async (message) => {
      if (!message) return;

      try {
        const messageBody = JSON.parse(message.content.toString()) as GatewayEvent;

        await handleGatewayEvent(messageBody.payload, messageBody.shardId);

        channel.ack(message);
      } catch (error) {
        bot.logger.error('There was an error handling events received from RabbitMQ', error);
      }
    })
    .catch(bot.logger.error);
}
