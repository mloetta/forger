import { Collection, createBot, createDesiredPropertiesObject, Intents, type Bot, type DesiredPropertiesBehavior } from "discordeno";
import { createProxyCache } from "dd-cache-proxy";
import type { ChatInput } from "../helpers/chatInput";
import type { ContextMenu } from "../helpers/contextMenu";
import { GATEWAY_URL, AUTHORIZATION, TOKEN, REST_URL } from "../utils/variables";
import { readDirectory } from "../utils/utils";
import { join } from "path";
import { Logger } from "../utils/logger";

declare module 'discordeno' {
  interface Bot {
    commands: Collection<string, ChatInput & ContextMenu>
  }
}

const desiredProperties = createDesiredPropertiesObject({
  interaction: {
    id: true,
    type: true,
    token: true,
    data: true,
    user: true,
    member: true,
    guildId: true,
    channelId: true,
  },
  message: {
    content: true,
    author: true,
    channelId: true,
  },
  user: {
    avatar: true,
    globalName: true,
    id: true,
    username: true,
    toggles: true
  },
})

interface BotDesiredProps extends Required<typeof desiredProperties> {}

const getProxyCacheBot = (bot: Bot<BotDesiredProps, DesiredPropertiesBehavior.RemoveKey>) =>
  createProxyCache(bot, {
    desiredProps: {
      user: ['avatar', 'id', 'globalName', 'username'],
    },
  })

export const bot = getProxyCacheBot(
  createBot({
    token: TOKEN,
    // intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,
    desiredProperties,
    rest: {
      proxy: {
        baseUrl: REST_URL,
        authorization: AUTHORIZATION
      },
    },
  })
)

// @ts-ignore
bot.gateway.requestMembers = async function (guildId, options) {
  await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      authorization: AUTHORIZATION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: "REQUEST_MEMBERS", guildId, options })
  })
    .then(res => res.text())
    .catch(() => undefined)
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

bot.start();