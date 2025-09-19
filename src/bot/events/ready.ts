import { bot } from '../bot'

export const ready: typeof bot.events.ready = async ({ shardId }) => {
  console.log(`Shard ID #${shardId} is ready.`)
}