import { Collection, createBot, GatewayIntents } from 'discordeno';
import type { WorkerPresenceUpdate, WorkerShardPayload } from 'gateway/worker/types';
import { GATEWAY_URL, REST_URL, TOKEN } from 'utils/variables';
import { readDirectory } from 'utils/utils';
import { join } from 'path';
import type { ApplicationCommand } from 'helpers/command';
import type { Event } from 'helpers/event';
import type { Bot, Events } from 'types/types';

declare module 'discordeno' {
  interface Bot {
    commands: Collection<string, ApplicationCommand>;
  }
}

export const bot = createBot({
  token: TOKEN,
  intents: GatewayIntents.Guilds,
  desiredProperties: {
    channel: {
      id: true,
      guildId: true,
      type: true,
    },
    guild: {
      id: true,
      members: true,
      presences: true,
      toggles: true,
    },
    member: {
      avatar: true,
      joinedAt: true,
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
      member: true,
      message: true,
      token: true,
      type: true,
      user: true,
      channel: true,
      authorizingIntegrationOwners: true,
    },
    user: {
      avatar: true,
      globalName: true,
      id: true,
      publicFlags: true,
      toggles: true,
      username: true,
    },
  },
  rest: {
    proxy: {
      baseUrl: REST_URL,
      authorization: TOKEN,
    },
  },
});

bot.commands = new Collection<string, ApplicationCommand>();

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

// Importing commands and events
const events = await readDirectory(join(__dirname, './events'));
const commands = await readDirectory(join(__dirname, './commands'));
