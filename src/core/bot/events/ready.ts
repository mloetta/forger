import { bot } from '../bot'

export const ready: typeof bot.events.ready = async ({ shardId }) => {
  bot.logger.info(`Shard ID #${shardId} is ready.`)
}