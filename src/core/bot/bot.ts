import {
  Collection,
  createBot,
  createDesiredPropertiesObject,
  GatewayIntents,
  type Bot,
  DesiredPropertiesBehavior,
} from 'discordeno';
import type {
  ManagerGetShardInfoFromGuildId,
  ShardInfo,
  WorkerPresenceUpdate,
  WorkerShardPayload,
} from 'gateway/worker/types';
import { GATEWAY_URL, REST_URL, TOKEN } from 'core/variables';
import type { ApplicationCommand } from 'helpers/command';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';
import { createProxyCache } from 'dd-cache-proxy';

const desiredProperties = createDesiredPropertiesObject({
  attachment: {
    contentType: true,
    filename: true,
    url: true,
  },
  channel: {
    guildId: true,
    id: true,
    type: true,
  },
  component: {
    component: true,
    components: true,
    value: true,
    values: true,
  },
  guild: {
    banner: true,
    channels: true,
    description: true,
    emojis: true,
    icon: true,
    id: true,
    members: true,
    name: true,
    ownerId: true,
    presences: true,
    premiumSubscriptionCount: true,
    preferredLocale: true,
    roles: true,
    stickers: true,
    toggles: true,
  },
  interaction: {
    authorizingIntegrationOwners: true,
    channel: true,
    channelId: true,
    data: true,
    guild: true,
    guildId: true,
    id: true,
    locale: true,
    member: true,
    message: true,
    token: true,
    type: true,
    user: true,
  },
  member: {
    avatar: true,
    guildId: true,
    id: true,
    joinedAt: true,
    nick: true,
    permissions: true,
    user: true,
  },
  message: {
    author: true,
    channelId: true,
    content: true,
    guildId: true,
    id: true,
  },
  role: {
    color: true,
    colors: true,
    guildId: true,
    id: true,
    name: true,
    permissions: true,
    toggles: true,
  },
  user: {
    avatar: true,
    banner: true,
    discriminator: true,
    globalName: true,
    id: true,
    publicFlags: true,
    toggles: true,
    username: true,
  },
});

interface BotDesiredProperties extends Required<typeof desiredProperties> {}

const getProxyCacheBot = (bot: Bot<BotDesiredProperties, DesiredPropertiesBehavior.RemoveKey>) =>
  createProxyCache(bot, {
    desiredProps: {
      guild: ['channels', 'icon', 'id', 'name', 'ownerId', 'roles', 'members'],
      channel: ['guildId', 'id', 'type'],
      member: ['avatar', 'id', 'joinedAt', 'nick', 'permissions', 'user', 'guildId'],
      role: ['color', 'id', 'name', 'permissions', 'guildId'],
      user: ['avatar', 'globalName', 'id', 'publicFlags', 'username'],
    },
    cacheOutsideMemory: {
      default: true,
    },
  });

const rawBot = getProxyCacheBot(
  createBot({
    token: TOKEN,
    intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers | GatewayIntents.GuildMessages,
    desiredProperties,
    rest: {
      proxy: {
        baseUrl: REST_URL,
        authorization: TOKEN,
      },
    },
  }),
);

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
  const res = (await makeRequest(GATEWAY_URL, {
    method: RequestMethod.POST,
    response: ResponseType.JSON,
    data: {
      type: 'ShardInfoFromGuild',
      guildId: guildId?.toString(),
    } as ManagerGetShardInfoFromGuildId,
    headers: { Authorization: TOKEN },
  })) as Omit<ShardInfo, 'nonce'>;

  if (!res) {
    throw new Error('Failed to get shard info: response is null or invalid');
  }

  return res;
}
