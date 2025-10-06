import type { ShardInfo, ManagerGetShardInfoFromGuildId } from 'gateway/worker/types';
import { GATEWAY_URL, TOKEN } from 'utils/variables';

export async function getShardInfoFromGuild(guildId?: bigint): Promise<Omit<ShardInfo, 'nonce'>> {
  const req = await fetch(GATEWAY_URL, {
    method: 'POST',
    body: JSON.stringify({
      type: 'ShardInfoFromGuild',
      guildId: guildId?.toString(),
    } as ManagerGetShardInfoFromGuildId),
    headers: {
      'Content-Type': 'application/json',
      Authorization: TOKEN,
    },
  });

  const res = await req.json();

  if (req.ok) return res;

  throw new Error(`There was an issue getting the shard info: ${res.error}`);
}
