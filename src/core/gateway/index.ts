import { GATEWAY_PORT } from 'utils/variables';
import { buildFastifyApp } from './fastify';
import { gateway, logger, workers } from './gateway';
import { shardInfoRequests } from './worker/createWorker';
import type {
  ManagerGetShardInfoFromGuildId,
  ShardInfo,
  WorkerMessage,
  WorkerPresenceUpdate,
  WorkerShardPayload,
} from './worker/types';
import 'utils/process';

const app = buildFastifyApp();

app.get('/timecheck', (_req, res) => {
  res.status(200).send({ message: Date.now() });
});

app.post('/', async (req, res) => {
  if (!req.body) {
    res.status(400).send({ message: 'Invalid body' });
    return;
  }

  const data = req.body as WorkerShardPayload | WorkerPresenceUpdate | ManagerGetShardInfoFromGuildId;

  if (data.type === 'ShardPayload') {
    await gateway.sendPayload(data.shardId, data.payload);
    return;
  }
  if (data.type === 'EditShardsPresence') {
    await gateway.editBotStatus(data.payload);
    return;
  }
  if (data.type === 'ShardInfoFromGuild') {
    // If we don't have a guildId, we use shard 0
    const shardId = data.guildId ? gateway.calculateShardId(data.guildId) : 0;
    const workerId = gateway.calculateWorkerId(shardId);
    const worker = workers.get(workerId);

    if (!worker) {
      await res.status(400).send({ error: `worker for shard ${shardId} not found` });
      return;
    }

    const nonce = crypto.randomUUID();

    const { promise, resolve } = Promise.withResolvers<ShardInfo>();

    shardInfoRequests.set(nonce, resolve);

    worker.postMessage({
      type: 'GetShardInfo',
      shardId,
      nonce,
    } satisfies WorkerMessage);

    const shardInfo = await promise;

    await res.status(200).send({
      shardId: shardInfo.shardId,
      rtt: shardInfo.rtt,
    } satisfies Omit<ShardInfo, 'nonce'>);
    return;
  }

  logger.warn(`Manager - Received unknown data type: ${(data as { type: string }).type}`);
});

await app.listen({ port: Number(GATEWAY_PORT) });

logger.info(`Gateway manager listening on port ${GATEWAY_PORT}`);

await gateway.spawnShards();
