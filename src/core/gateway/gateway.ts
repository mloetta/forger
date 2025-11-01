import type { Worker } from 'worker_threads';
import { createGatewayManager, createLogger, createRestManager, GatewayIntents } from 'discordeno';
import type { ManagerMessage, WorkerMessage } from './worker/types';
import { REST_URL, TOKEN } from 'core/variables';
import { createWorker } from './worker/createWorker';

export const workers = new Map<number, Worker>();

export const logger = createLogger({ name: 'GATEWAY' });

const rest = createRestManager({
  token: TOKEN,
  proxy: {
    baseUrl: REST_URL,
    authorization: TOKEN,
  },
});

export const gateway = createGatewayManager({
  token: TOKEN,
  intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers | GatewayIntents.GuildMessages,
  connection: await rest.getGatewayBot(),
  shardsPerWorker: 16,
  // totalShards: 1,
  totalWorkers: 4,
  resharding: {
    enabled: true,
    shardsFullPercentage: 80,
    checkInterval: 28800000, // 8 hours
    getSessionInfo: rest.getGatewayBot,
  },
});

gateway.resharding.tellWorkerToPrepare = async (workerId, shardId, bucketId) => {
  logger.info(`Tell worker to prepare, workerId: ${workerId}, shardId: ${shardId}, bucketId: ${bucketId}`);

  let worker = workers.get(workerId);
  if (!worker) {
    worker = createWorker(workerId);
    workers.set(workerId, worker);
  }

  worker?.postMessage({
    type: 'PrepareShard',
    shardId,
    totalShards: gateway.totalShards,
  } satisfies WorkerMessage);

  const { promise, resolve } = Promise.withResolvers<void>();

  const waitForShardPrepared = (message: ManagerMessage) => {
    if (message.type === 'ShardPrepared' && message.shardId === shardId) {
      resolve();
    }
  };

  worker.on('message', waitForShardPrepared);

  await promise;

  worker.off('message', waitForShardPrepared);
};

gateway.resharding.onReshardingSwitch = async () => {
  logger.info('Resharding switch triggered, telling workers to switch the shards');

  for (const worker of workers.values()) {
    worker.postMessage({
      type: 'SwitchShards',
    } satisfies WorkerMessage);
  }
};

gateway.tellWorkerToIdentify = async (workerId, shardId, bucketId) => {
  logger.info(`Tell worker to identify, workerId: ${workerId}, shardId: ${shardId}, bucketId: ${bucketId}`);

  const worker = workers.get(workerId) ?? createWorker(workerId);
  workers.set(workerId, worker);

  worker.postMessage({
    type: 'IdentifyShard',
    shardId,
  } satisfies WorkerMessage);

  const { promise, resolve } = Promise.withResolvers<void>();

  const waitForShardIdentified = (message: ManagerMessage) => {
    if (message.type === 'ShardIdentified' && message.shardId === shardId) {
      resolve();
    }
  };

  worker.on('message', waitForShardIdentified);

  await promise;

  worker.off('message', waitForShardIdentified);
};

gateway.sendPayload = async (shardId, payload) => {
  const workerId = gateway.calculateWorkerId(shardId);
  const worker = workers.get(workerId);

  if (!worker) return;

  worker.postMessage({
    type: 'ShardPayload',
    shardId,
    payload,
  } satisfies WorkerMessage);
};

gateway.editBotStatus = async (payload) => {
  const workersArray = Array.from(workers.values());

  for (const worker of workersArray) {
    worker.postMessage({
      type: 'EditShardsPresence',
      payload,
    } satisfies WorkerMessage);
  }
};
