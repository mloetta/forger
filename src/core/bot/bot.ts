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
import { GATEWAY_URL, REST_URL, BOT_TOKEN } from 'core/variables';
import type { ApplicationCommand } from 'helpers/command';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';
import { createProxyCache } from 'dd-cache-proxy';
import type { RedisType } from 'types/types';
import { timestamp, TimestampStyle } from 'utils/markdown';

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
    parentId: true,
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
    roles: true,
    communicationDisabledUntil: true,
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
    position: true,
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

const getProxyCacheBot = (bot: Bot<BotDesiredProperties, DesiredPropertiesBehavior.ChangeType>) =>
  createProxyCache(bot, {
    desiredProps: {
      guild: ['channels', 'icon', 'id', 'name', 'ownerId', 'roles', 'members'],
      channel: ['guildId', 'id', 'type', 'parentId', 'internalOverwrites'],
      member: [
        'avatar',
        'id',
        'joinedAt',
        'nick',
        'permissions',
        'user',
        'guildId',
        'roles',
        'communicationDisabledUntil',
      ],
      role: ['color', 'id', 'name', 'permissions', 'guildId', 'position'],
      user: ['avatar', 'globalName', 'id', 'publicFlags', 'username'],
    },
  });

const rawBot = getProxyCacheBot(
  createBot({
    token: BOT_TOKEN,
    intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers | GatewayIntents.GuildMessages,
    desiredProperties,
    desiredPropertiesBehavior: DesiredPropertiesBehavior.ChangeType,
    rest: {
      proxy: {
        baseUrl: REST_URL,
        authorization: BOT_TOKEN,
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
      headers: { Authorization: BOT_TOKEN },
      data: {
        type: 'ShardPayload',
        shardId,
        payload,
      } satisfies WorkerShardPayload,
    });
  };

  bot.gateway.editBotStatus = async (payload) => {
    await makeRequest(GATEWAY_URL, {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: { Authorization: BOT_TOKEN },
      data: {
        type: 'EditShardsPresence',
        payload,
      } satisfies WorkerPresenceUpdate,
    });
  };
}

export async function getShardInfoFromGuild(guildId?: bigint): Promise<Omit<ShardInfo, 'nonce'>> {
  const res = (await makeRequest(GATEWAY_URL, {
    method: RequestMethod.POST,
    response: ResponseType.JSON,
    headers: { Authorization: BOT_TOKEN },
    data: {
      type: 'ShardInfoFromGuild',
      guildId: guildId?.toString(),
    } as ManagerGetShardInfoFromGuildId,
  })) as Omit<ShardInfo, 'nonce'>;

  if (!res) {
    throw new Error('Failed to get shard info: response is null or invalid');
  }

  return res;
}

export async function processReminders(bot: CustomBot, redis: RedisType) {
  const now = Date.now();

  const expired = await redis.zRangeByScore('reminders', 0, now);

  for (const reminderId of expired) {
    try {
      const data = await redis.hGetAll(`reminder:${reminderId}`);
      if (!data || !data.userId) continue;

      const user = await bot.helpers.getUser(data.userId);
      const dm = await bot.helpers.getDmChannel(user.id);
      await bot.helpers.sendMessage(dm.id, {
        content: `${data.reason}\n-# Reminder created at ${timestamp(Number(data.createdAt), TimestampStyle.LongDate)}`,
      });
    } catch (e) {
      bot.logger.error(`Failed to send reminder ${reminderId}:`, e);
    } finally {
      await redis.zRem('reminders', reminderId);
      await redis.del(`reminder:${reminderId}`);
    }
  }
}
