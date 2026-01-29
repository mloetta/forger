import { Collection, createBot, createDesiredPropertiesObject, DesiredPropertiesBehavior } from 'discordeno';
import type {
  ManagerGetShardInfoFromGuildId,
  ShardInfo,
  WorkerPresenceUpdate,
  WorkerShardPayload,
} from 'gateway/worker/types';
import { GATEWAY_URL, REST_URL, BOT_TOKEN } from 'core/variables';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';
import type { ApplicationCommand } from 'types/types';

const desiredProperties = createDesiredPropertiesObject({
  channel: {
    guildId: true,
    id: true,
    parentId: true,
    type: true,
  },
  guild: {
    channels: true,
    roles: true,
    id: true,
    ownerId: true,
  },
  interaction: {
    channelId: true,
    data: true,
    guildId: true,
    id: true,
    member: true,
    token: true,
    type: true,
    user: true,
  },
  member: {
    communicationDisabledUntil: true,
    id: true,
    roles: true,
  },
  role: {
    guildId: true,
    id: true,
    permissions: true,
  },
  user: {
    id: true,
    username: true,
  },
});

const rawBot = createBot({
  token: BOT_TOKEN,
  desiredProperties,
  desiredPropertiesBehavior: DesiredPropertiesBehavior.ChangeType,
  rest: {
    proxy: {
      baseUrl: REST_URL,
      authorization: BOT_TOKEN,
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
      headers: { Authorization: BOT_TOKEN },
      body: {
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
      body: {
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
    body: {
      type: 'ShardInfoFromGuild',
      guildId: guildId?.toString(),
    } as ManagerGetShardInfoFromGuildId,
  })) as Omit<ShardInfo, 'nonce'>;

  if (!res) {
    throw new Error('Failed to get shard info: response is null or invalid');
  }

  return res;
}
