import assert from 'assert';
import { workerData as _workerData, parentPort } from 'worker_threads';
import {
  type Camelize,
  createLogger,
  DiscordenoShard,
  type DiscordGatewayPayload,
  GatewayOpcodes,
  ShardSocketCloseCodes,
} from 'discordeno';
import type { ManagerMessage, WorkerCreateData, WorkerMessage } from './types.js';
import { makeRequest } from 'utils/request.js';
import { RequestMethod, ResponseType } from 'types/types.js';

assert(parentPort);

const workerData: WorkerCreateData = _workerData;

const logger = createLogger({ name: `Worker #${workerData.workerId}` });

const identifyPromises = new Map<number, () => void>();
const shards = new Map<number, DiscordenoShard>();
const pendingShards = new Map<number, DiscordenoShard>();

let totalShards = workerData.connectionData.totalShards;

parentPort.on('message', async (message: WorkerMessage) => {
  assert(parentPort);

  switch (message.type) {
    case 'IdentifyShard': {
      logger.info(`Starting to identify shard #${message.shardId}`);
      const shard = shards.get(message.shardId) ?? createShard(message.shardId);
      shards.set(message.shardId, shard);

      await shard.identify();

      parentPort.postMessage({
        type: 'ShardIdentified',
        shardId: message.shardId,
      } satisfies ManagerMessage);
      break;
    }
    case 'PrepareShard': {
      logger.info(`Preparing shard #${message.shardId}`);
      totalShards = message.totalShards;
      let shard = pendingShards.get(message.shardId);
      if (!shard) {
        shard = createShard(message.shardId);
        pendingShards.set(message.shardId, shard);
      }

      // Ignore the events
      // TODO: If you need 'gateway.resharding.updateGuildsShardId', you can just listen to the ready event and use its data for the function call
      shard.events.message = () => {};

      await shard.identify();

      parentPort.postMessage({
        type: 'ShardPrepared',
        shardId: message.shardId,
      } satisfies ManagerMessage);
      break;
    }
    case 'SwitchShards': {
      logger.info('Switching shards');

      // Change the message event for all shards
      for (const shard of pendingShards.values()) {
        shard.events.message = handleShardMessageEvent;
      }

      // Old shards stop processing events
      for (const shard of shards.values()) {
        const oldHandler = shard.events.message;
        shard.events.message = async function (_, message) {
          // Member checks need to continue but others can stop
          if (message.t === 'GUILD_MEMBERS_CHUNK') oldHandler?.(shard, message);
        };
      }

      // Shutdown the old shards
      const shardsToShutdown = Array.from(shards.values());

      // Move the pending shards to the active shards
      shards.clear();
      for (const [shardId, shard] of pendingShards.entries()) {
        shards.set(shardId, shard);
        pendingShards.delete(shardId);
      }

      // Shutdown the old shards
      const promises = shardsToShutdown.map(async (shard) => {
        await shard.close(ShardSocketCloseCodes.Resharded, 'Shard is being resharded');
        logger.info(`Shard #${shard.id} has been shutdown`);
      });

      await Promise.all(promises);
      break;
    }
    case 'AllowIdentify': {
      identifyPromises.get(message.shardId)?.();
      identifyPromises.delete(message.shardId);
      break;
    }
    case 'ShardPayload': {
      const shard = shards.get(message.shardId);
      if (!shard) return;
      await shard.send(message.payload);
      break;
    }
    case 'EditShardsPresence': {
      const promises = Array.from(shards.values()).map(async (shard) => {
        await shard.send({
          op: GatewayOpcodes.PresenceUpdate,
          d: {
            since: null,
            afk: false,
            activities: message.payload.activities,
            status: message.payload.status,
          },
        });
      });
      await Promise.all(promises);
      break;
    }
    case 'GetShardInfo': {
      const status = {
        type: 'ShardInfo',
        shardId: message.shardId,
        rtt: shards.get(message.shardId)?.heart.rtt ?? -1,
        nonce: message.nonce,
      } satisfies ManagerMessage;

      parentPort.postMessage(status);
      break;
    }
    default:
      logger.warn(`Received unknown message type: ${(message as { type: string }).type}`);
  }
});

function createShard(shardId: number): DiscordenoShard {
  const shard = new DiscordenoShard({
    id: shardId,
    events: {},
    connection: {
      compress: false,
      intents: workerData.connectionData.intents,
      properties: {
        os: process.platform,
        browser: 'Discordeno',
        device: 'Discordeno',
      },
      token: workerData.connectionData.token,
      totalShards,
      url: workerData.connectionData.url,
      version: workerData.connectionData.version,
      transportCompression: null,
    },
  });

  shard.requestIdentify = async () => {
    assert(parentPort);
    const { promise, resolve } = Promise.withResolvers<void>();
    parentPort.postMessage({
      type: 'RequestIdentify',
      shardId,
    } satisfies ManagerMessage);

    identifyPromises.set(shardId, resolve);

    return await promise;
  };

  shard.events.message = handleShardMessageEvent;

  return shard;
}

async function handleShardMessageEvent(shard: DiscordenoShard, payload: Camelize<DiscordGatewayPayload>) {
  const data = { payload, shardId: shard.id };

  const url = workerData.bot.urls[shard.id % workerData.bot.urls.length];
  if (!url) {
    logger.error('No url found to send events to');

    return;
  }

  await makeRequest(url, {
    method: RequestMethod.POST,
    response: ResponseType.JSON,
    body: data,
    headers: { Authorization: workerData.bot.authorization },
  }).catch((error) => logger.error('Failed to send events to the bot code', error));
}
