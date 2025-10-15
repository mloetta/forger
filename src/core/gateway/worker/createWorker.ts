import { join } from 'path';
import { Worker } from 'worker_threads';
import {
  TOKEN,
  EVENT_SERVER_URL,
  MESSAGEQUEUE_ENABLE,
  RABBITMQ_USERNAME,
  RABBITMQ_PASSWORD,
  RABBITMQ_URL,
} from 'utils/variables';
import { gateway, logger } from 'gateway/gateway';
import type { ManagerMessage, ShardInfo, WorkerCreateData, WorkerMessage } from './types';

// the string is the nonce of the request
export const shardInfoRequests = new Map<string, (value: ShardInfo) => void>();

export function createWorker(workerId: number): Worker {
  const workerFilePath = join(__dirname, './worker.ts');

  const worker = new Worker(workerFilePath, {
    workerData: {
      connectionData: {
        intents: gateway.intents,
        token: TOKEN,
        url: gateway.url,
        version: gateway.version,
        totalShards: gateway.totalShards,
      },
      eventHandler: {
        urls: [EVENT_SERVER_URL],
        authentication: TOKEN,
      },
      workerId,
      messageQueue: {
        enabled: Boolean(MESSAGEQUEUE_ENABLE),
        username: RABBITMQ_USERNAME,
        password: RABBITMQ_PASSWORD,
        url: RABBITMQ_URL,
      },
    } satisfies WorkerCreateData,
  });

  worker.on('message', async (message: ManagerMessage) => {
    switch (message.type) {
      case 'RequestIdentify': {
        logger.info(`Requesting identify for shardId: #${message.shardId}`);
        await gateway.requestIdentify(message.shardId);

        worker.postMessage({
          type: 'AllowIdentify',
          shardId: message.shardId,
        } satisfies WorkerMessage);

        break;
      }
      case 'ShardInfo': {
        shardInfoRequests.get(message.nonce)?.(message);
        shardInfoRequests.delete(message.nonce);

        break;
      }
      case 'ShardIdentified': {
        logger.info(`Shard #${message.shardId} identified`);

        break;
      }
      default: {
        logger.warn(`Worker - Received unknown message type: ${(message as { type: string }).type}`);
      }
    }
  });

  return worker;
}
