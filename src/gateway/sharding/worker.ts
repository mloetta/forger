import { Collection, DiscordenoShard } from "discordeno";
import { parentPort, workerData } from 'worker_threads'
import { AUTHORIZATION, EVENT_SERVER_URL } from "../../utils/variables";

if (!parentPort) throw new Error('Parent port is null')

const SHARDS = new Collection<number, DiscordenoShard>()

function getUrlFromShardId(totalShards: number, shardId: number) {
  const urls = EVENT_SERVER_URL
  const index = totalShards % shardId

  return urls[index] ?? urls[0]
}

function createShard(data: any) {
  const shard = new DiscordenoShard({
    id: data.shardId,
    connection: {
      compress: data.compress,
      intents: data.intents,
      properties: data.properties,
      token: data.token,
      totalShards: data.totalShards,
      url: data.url,
      version: data.version,
      transportCompression: null
    },
    events: {
      async message(shard, payload) {
        await fetch(getUrlFromShardId(data.totalShards, shard.id), {
          method: 'POST',
          headers: {
            authorization: AUTHORIZATION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payload, shardId: shard.id }),
        })
          .then(res => res.text())
          .catch(console.error)
      },
    }
  })

  shard.forwardToBot = function (packet) {
    this.events.message?.(this, packet)
  }

  return shard
}

parentPort.on('message', async data => {
  try {
    switch (data.type) {
      case 'IDENTIFY_SHARD': {
        console.log(`[Sharding Worker #${workerData.workerId}] identifying ${SHARDS.has(data.shardId) ? 'existing' : 'new'} shard (${data.shardId})`)

        const shard = SHARDS.get(data.shardId) ?? createShard(data)

        SHARDS.set(shard.id, shard)

        await shard.identify()
        break;
      }
      default: {
        console.error(`[Sharding Worker #${workerData.workerId}] Unknown request received. ${JSON.stringify(data)}`)
      }
    }
  } catch (e) {
    console.error(e)
  }
})

console.log(`[Sharding Worker #${workerData.workerId}] Sharding Worker Started.`)