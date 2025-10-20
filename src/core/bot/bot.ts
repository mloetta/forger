import { Collection, createBot, GatewayIntents } from 'discordeno';
import type {
  ManagerGetShardInfoFromGuildId,
  ShardInfo,
  WorkerPresenceUpdate,
  WorkerShardPayload,
} from 'gateway/worker/types';
import { GATEWAY_URL, REST_URL, TOKEN } from 'utils/variables';
import type { ApplicationCommand } from 'helpers/command';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';

const rawBot = createBot({
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
      icon: true,
      banner: true,
      channels: true,
      name: true,
      description: true,
      emojis: true,
      stickers: true,
      premiumSubscriptionCount: true,
      roles: true,
      ownerId: true,
      preferredLocale: true,
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
    role: {
      id: true,
      name: true,
      permissions: true,
      toggles: true,
      color: true,
      colors: true,
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
    component: {
      component: true,
      components: true,
      value: true,
      values: true,
    },
  },
  rest: {
    proxy: {
      baseUrl: REST_URL,
      authorization: TOKEN,
    },
  },
});

// If you want to add custom properties to the bot, you can extend the CustomBot type by adding your own
export type CustomBot = typeof rawBot & {
  commands: Collection<string, ApplicationCommand>;
};

export const bot = rawBot as CustomBot;

bot.commands = new Collection<string, ApplicationCommand>();

overrideGatewayImplementations(bot);

// Override the default gateway functions to allow the methods on the gateway object to proxy the requests to the gateway proxy
function overrideGatewayImplementations(bot: CustomBot): void {
  bot.gateway.sendPayload = async (shardId, payload) => {
    await makeRequest(GATEWAY_URL, {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      data: {
        type: 'ShardPayload',
        shardId,
        payload,
      } satisfies WorkerShardPayload,
      headers: { Authorization: TOKEN },
    });
  };

  bot.gateway.editBotStatus = async (payload) => {
    await makeRequest(GATEWAY_URL, {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      data: {
        type: 'EditShardsPresence',
        payload,
      } satisfies WorkerPresenceUpdate,
      headers: { Authorization: TOKEN },
    });
  };
}

export async function getShardInfoFromGuild(guildId?: bigint): Promise<Omit<ShardInfo, 'nonce'>> {
  const req = await makeRequest(GATEWAY_URL, {
    method: RequestMethod.POST,
    response: ResponseType.JSON,
    data: {
      type: 'ShardInfoFromGuild',
      guildId: guildId?.toString(),
    } as ManagerGetShardInfoFromGuildId,
    headers: { Authorization: TOKEN },
  });

  const res = await req.json();

  if (req.ok) return res as Omit<ShardInfo, 'nonce'>;

  throw new Error(`There was an issue getting the shard info: ${(res as any).error}`);
}
