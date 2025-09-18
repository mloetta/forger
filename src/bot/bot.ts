import { Collection, createBot, Intents } from "discordeno";
import { readDirectory } from "../utils/utils";
import type { ChatInput } from "../helpers/chatInput";
import type { ContextMenu } from "../helpers/contextMenu";
import { GATEWAY_URL, AUTHORIZATION, TOKEN, REST_URL } from "../utils/variables";
import { join } from "path";
import * as util from 'util'

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
    },
    message: {
      content: true,
      author: true,
      channelId: true,
    },
    user: {
      id: true,
      toggles: true
    }
  },
  rest: {
    proxy: {
      baseUrl: REST_URL,
      authorization: AUTHORIZATION
    },
  },
  events: {
    async messageCreate(message) {
      if (message.author.bot) return;

      if (message.author.id !== BigInt('782946852278501407')) return;

      if (!message.content.startsWith('pt.eval')) return;

      const args = message.content.split(' ');
      args.shift();

      const cleanArgs = args.join(' ').replace(/^\s+/, '').replace(/\s*$/, '');

      let result;
      try {
        result = eval(cleanArgs);
      } catch (e) {
        result = e;
      }

      const response = ['```ts'];
      const regex = new RegExp(TOKEN, 'gi');

      if (result && typeof result.then === 'function') {
        let value
        try {
          value = await result
        } catch (e) {
          value = e;
        }

        response.push(
          util
            .inspect(value, { depth: 1 })
            .replace(regex, 'nuh uh')
            .substring(0, 1985),
        )
      } else {
        response.push(
          String(util.inspect(result))
            .replace(regex, 'nuh uh')
            .substring(0, 1985)
        )
      }

      response.push('```')

      await bot.rest.sendMessage(message.channelId, {
        content: response.join('\n')
      })
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

bot.start();