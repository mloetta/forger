import { Collection, createBot, createDesiredPropertiesObject, GatewayIntents } from 'discordeno';
import type {
  ManagerGetShardInfoFromGuildId,
  ShardInfo,
  WorkerPresenceUpdate,
  WorkerShardPayload,
} from 'gateway/worker/types';
import { GATEWAY_URL, REST_URL, TOKEN } from 'utils/variables';
import { readDirectory } from 'utils/utils';
import { join } from 'path';
import type { ApplicationCommand } from 'helpers/command';
import type { Event } from 'helpers/event';
import type { Bot, Events } from 'types/types';
import type { Component } from 'helpers/component';

declare module 'discordeno' {
  interface Bot {
    commands: Collection<string, ApplicationCommand>;
    buttons: Collection<string, Component<'Button'>>;
    selectMenus: Collection<string, Component<'SelectMenu'>>;
    modals: Collection<string, Component<'Modal'>>;
  }
}

// Desired props object
const desiredProperties = createDesiredPropertiesObject({
  guild: {
    id: true,
    members: true,
    toggles: true,
  },
  member: {
    avatar: true,
    nick: true,
    user: true,
    permissions: true,
  },
  message: {
    id: true,
  },
  interaction: {
    data: true,
    guild: true,
    id: true,
    locale: true,
    message: true,
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
  },
});

export const bot = createBot({
  token: TOKEN,
  intents: GatewayIntents.Guilds,
  desiredProperties,
  rest: {
    proxy: {
      baseUrl: REST_URL,
      authorization: TOKEN,
    },
  },
});

overrideGatewayImplementations(bot);

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
        Authorization: TOKEN,
      },
    });
  };

  bot.gateway.editBotStatus = async (payload) => {
    await fetch(GATEWAY_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'EditShardsPresence',
        payload,
      } satisfies WorkerPresenceUpdate),
      headers: {
        'Content-Type': 'application/json',
        Authorization: TOKEN,
      },
    });
  };
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
      Authorization: TOKEN,
    },
  });

  const res = await req.json();

  if (req.ok) return res;

  throw new Error(`There was an issue getting the shard info: ${res.error}`);
}

const events = await readDirectory(join(__dirname, './events'));
bot.events = events.reduce((acc, mod) => {
  const event = mod.default as Event<keyof Events>;
  acc[event.name] = event.run as Events[typeof event.name];
  return acc;
}, {} as Events);

const commands = await readDirectory(join(__dirname, './commands'));
bot.commands = new Collection<string, ApplicationCommand>();

for (const module of commands) {
  const command = module.default;

  bot.commands.set(command.name.global ?? command.name, command);
}

const buttons = await readDirectory(join(__dirname, './components/buttons'));
bot.buttons = new Collection<string, Component<'Button'>>();

for (const module of buttons) {
  const button = module.default;

  bot.buttons.set(button.name, button);
}

const selectMenus = await readDirectory(join(__dirname, './components/selectMenus'));
bot.selectMenus = new Collection<string, Component<'SelectMenu'>>();

for (const module of selectMenus) {
  const selectMenu = module.default;

  bot.selectMenus.set(selectMenu.name, selectMenu);
}

const modals = await readDirectory(join(__dirname, './components/modals'));
bot.modals = new Collection<string, Component<'Modal'>>();

for (const module of modals) {
  const modal = module.default;

  bot.modals.set(modal.name, modal);
}
