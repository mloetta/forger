import { join } from "path";
import { Worker } from "worker_threads";
import { TOKEN, EVENT_SERVER_URL } from "utils/variables";
import { gateway, logger } from "gateway/gateway";
import type {
  ManagerMessage,
  ShardInfo,
  WorkerCreateData,
  WorkerMessage,
} from "./types";

// the string is the nonce of the request
export const shardInfoRequests = new Map<string, (value: ShardInfo) => void>();

export function createWorker(workerId: number): Worker {
  const workerFilePath = join(__dirname, "./worker.ts");

  const worker = new Worker(workerFilePath, {
    workerData: {
      connectionData: {
        intents: gateway.intents,
        token: TOKEN,
        totalShards: gateway.totalShards,
        url: gateway.url,
        version: gateway.version,
      },
      eventHandler: {
        urls: [EVENT_SERVER_URL],
        authentication: TOKEN,
      },
      workerId,
    } satisfies WorkerCreateData,
  });

  worker.on("message", async (message: ManagerMessage) => {
    if (message.type === "RequestIdentify") {
      logger.info(`Requesting identify for shardId: #${message.shardId}`);
      await gateway.requestIdentify(message.shardId);

      worker.postMessage({
        type: "AllowIdentify",
        shardId: message.shardId,
      } satisfies WorkerMessage);

      return;
    }
    if (message.type === "ShardInfo") {
      shardInfoRequests.get(message.nonce)?.(message);
      shardInfoRequests.delete(message.nonce);
      return;
    }
    if (message.type === "ShardIdentified") {
      logger.info(`Shard #${message.shardId} identified`);
      return;
    }

    logger.warn(
      `Worker - Received unknown message type: ${(message as { type: string }).type}`,
    );
  });

  return worker;
}
