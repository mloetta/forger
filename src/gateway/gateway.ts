import { createGatewayManager, GatewayIntents } from "discordeno";
import { rest } from "./rest";
import { AUTHORIZATION, SHARD_SERVER_URL, TOKEN } from "../utils/variables";

export const gateway = createGatewayManager({
  token: TOKEN,
  // intents: GatewayIntents.Guilds | GatewayIntents.GuildMessages | GatewayIntents.MessageContent,
  connection: await rest.getSessionInfo(),
  resharding: {
    enabled: true,
    shardsFullPercentage: 80,
    checkInterval: 28800000, // 8 hours
    getSessionInfo: rest.getSessionInfo
  }
});

gateway.tellWorkerToIdentify = async function (workerId, shardId, bucketId) {
  const url = SHARD_SERVER_URL
  if (!url) {
    return console.error(`No server URL found for server #${workerId}. Unable to start Shard #${shardId}`)
  }

  await fetch(url, {
    method: 'POST',
    headers: {
      authorization: AUTHORIZATION,
      'Content-type': 'application/json',
    },
    body: JSON.stringify({ type: 'IDENTIFY_SHARD', shardId })
  })
    .then(res => res.json())
    .catch(console.error)
}

gateway.spawnShards()