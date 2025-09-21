import { Collection, createBot, createDesiredPropertiesObject, GatewayIntents, type Bot, type DesiredPropertiesBehavior } from "discordeno";
import type { ManagerGetShardInfoFromGuildId, ShardInfo, WorkerPresenceUpdate, WorkerShardPayload } from 'gateway/worker/types'
import { AUTHORIZATION, GATEWAY_URL, REST_URL, TOKEN } from "utils/variables";
import { readDirectory } from "utils/utils";
import { join } from "path";
import { createProxyCache } from "dd-cache-proxy";
import type { ApplicationCommand } from "helpers/command";

declare module 'discordeno' {
  interface Bot {
    commands: Collection<string, ApplicationCommand>
  }
}

// Desired props object
const desiredProperties = createDesiredPropertiesObject({
  interaction: {
    data: true,
    guildId: true,
    id: true,
    locale: true,
    token: true,
    type: true,
    user: true,
  },
  user: {
    avatar: true,
    globalName: true,
    id: true,
    publicFlags: true,
    toggles: true,
    username: true,
  }
});

/*
// This will be needed to provide the type for the bot parameter of our function.
interface BotDesiredProperties extends Required<typeof desiredProperties> {}

const getProxyCacheBot = (bot: Bot<BotDesiredProperties, DesiredPropertiesBehavior.RemoveKey>) =>
  createProxyCache(bot, {
    desiredProps: {
      interaction: ['data', 'id', 'token', 'type', 'user'],
      user: ['avatar', 'globalName', 'id', 'publicFlags', 'toggles', 'username']
    },
    cacheInMemory: {
      user: true,
      default: false
    }
  })
*/

export const bot = createBot({
  token: TOKEN,
  intents: GatewayIntents.Guilds,
  desiredProperties,
  rest: {
    proxy: {
      baseUrl: REST_URL,
      authorization: AUTHORIZATION
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
      } satisfies WorkerPresenceUpdate),
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