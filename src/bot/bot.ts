import { Collection, createBot, Intents } from "discordeno";
import { readDirectory } from "../utils/utils";
import type { ChatInput } from "../helpers/chatInput";
import type { ContextMenu } from "../helpers/contextMenu";
import { GATEWAY_URL, AUTHORIZATION, TOKEN, REST_URL } from "../utils/variables";
import { join } from "path";

declare module 'discordeno' {
  interface Bot {
    commands: Collection<string, ChatInput & ContextMenu>
  }
}

export const bot = createBot({
  token: TOKEN,
  intents: Intents.Guilds,
  desiredProperties: {
    interaction: {
      id: true,
      type: true,
      token: true,
      data: true,
      user: true,
      member: true,
      guildId: true,
      channelId: true,
    }
  },
  rest: {
    proxy: {
      baseUrl: REST_URL,
      authorization: AUTHORIZATION
    },
  }
})

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

// bot.start();