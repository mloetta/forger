import type { DiscordGatewayPayload, GatewayDispatchEventNames } from "discordeno";
import { EVENT_SERVER_PORT } from "../../utils/variables";
import { bot } from "./bot";
import { buildFastifyApp } from "./fastify";

interface GatewayEvent {
  payload: DiscordGatewayPayload
  shardId: number
}

const app = buildFastifyApp()

app.get('/timecheck', async (_req, res) => {
  res.status(200).send({ message: Date.now() })
})

app.post('/', async (req, res) => {
  const body = req.body as GatewayEvent

  try {
    await handleGatewayEvent(body.payload, body.shardId)
    res.status(200).send()
  } catch (error) {
    bot.logger.error('There was an error handling the incoming gateway command', error)
    res.status(500).send()
  }
})

await app.listen({ port: Number(EVENT_SERVER_PORT) })

bot.logger.info(`Bot event handler is listening on port ${EVENT_SERVER_PORT}`)

async function handleGatewayEvent(payload: DiscordGatewayPayload, shardId: number): Promise<void> {
  bot.events.raw?.(payload, shardId)

  if (!payload.t) return

  await bot.events.dispatchRequirements?.(payload, shardId)

  bot.handlers[payload.t as GatewayDispatchEventNames]?.(bot, payload, shardId)
}