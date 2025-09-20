import { Collection, createBot, GatewayIntents, Intents, type Bot } from "discordeno";
import type { ManagerGetShardInfoFromGuildId, ShardInfo, WorkerStatusUpdate, WorkerShardPayload } from '../gateway/worker/types.ts'
import { AUTHORIZATION, GATEWAY_URL, TOKEN } from "../../utils/variables.ts";
import type { ChatInput } from "../../helpers/chatInput.ts";
import type { ContextMenu } from "../../helpers/contextMenu.ts";
import { readDirectory } from "../../utils/utils.ts";
import { join } from "path";
import { Logger } from "../../utils/logger.ts";

declare module 'discordeno' {
  interface Bot {
    commands: Collection<string, ChatInput & ContextMenu>
  }
}

export const bot = createBot({
  token: TOKEN,
  intents: GatewayIntents.Guilds,
  desiredProperties: {
    interaction: {
      id: true,
      type: true,
      token: true,
      data: true,
      user: true,
    },
    user: {
      id: true,
      username: true,
      discriminator: true,
      avatar: true,
      globalName: true,
      publicFlags: true,
      toggles: true
    }
  }
})

// @ts-ignore
overrideGatewayImplementations(bot)

// Override the default gateway functions to allow the methods on the gateway object to proxy the requests to the gateway proxy
function overrideGatewayImplementations(bot: Bot): void {
  bot.gateway.sendPayload = async (shardId, payload) => {
    await fetch(GATEWAY_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'ShardPayload',
        shardId,
        payload,
      } satisfies WorkerShardPayload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: AUTHORIZATION,
      },
    })
  }

  bot.gateway.editBotStatus = async (payload) => {
    await fetch(GATEWAY_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'EditShardsPresence',
        payload,
      } satisfies WorkerStatusUpdate),
      headers: {
        'Content-Type': 'application/json',
        Authorization: AUTHORIZATION,
      },
    })
  }
}

export async function getShardInfoFromGuild(guildId?: bigint): Promise<Omit<ShardInfo, 'nonce'>> {
  const req = await fetch(GATEWAY_URL, {
    method: 'POST',
    body: JSON.stringify({
      type: 'ShardInfoFromGuild',
      guildId: guildId?.toString(),
    } as ManagerGetShardInfoFromGuildId),
    headers: {
      'Content-Type': 'application/json',
      Authorization: AUTHORIZATION,
    },
  })

  const res = await req.json()

  if (req.ok) return res

  throw new Error(`There was an issue getting the shard info: ${res.error}`)
}

const events = await readDirectory(join(__dirname, './events'));
bot.events = events.reduce((acc, mod) => {
  for (const [name, handler] of Object.entries(mod)) {
    acc[name as keyof typeof bot.events] = handler;
  }
  return acc;
}, {} as typeof bot.events);

const commands = await readDirectory(join(__dirname, './commands'));
bot.commands = new Collection();

for (const module of commands) {
  const command = module.command

  bot.commands.set(command.name, command);
}