import {
  Collection,
  createBot,
  createDesiredPropertiesObject,
  createLogger,
  DesiredPropertiesBehavior,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import type {
  ManagerGetShardInfoFromGuildId,
  ShardInfo,
  WorkerPresenceUpdate,
  WorkerShardPayload,
} from 'gateway/worker/types';
import { GATEWAY_URL, REST_URL, BOT_TOKEN } from 'core/variables';
import { RequestMethod, ResponseType, type ApplicationCommand } from 'types/types';
import { makeRequest } from 'utils/request';
import { link } from 'utils/markdown';

export const logger = createLogger({ name: 'BOT' });

const desiredProperties = createDesiredPropertiesObject({
  attachment: {
    contentType: true,
    filename: true,
    url: true,
  },
  channel: {
    guildId: true,
    id: true,
    parentId: true,
    type: true,
  },
  component: {
    component: true,
    components: true,
    customId: true,
    value: true,
    values: true,
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
    message: true,
    member: true,
    token: true,
    type: true,
    user: true,
  },
  message: {
    id: true,
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

// Override interaction methods to add top.gg link
const sendInteractionResponse = bot.helpers.sendInteractionResponse;

bot.helpers.sendInteractionResponse = async (interactionId, token, options) => {
  if (options.data) {
    const isComponentsV2 = Boolean((options.data.flags ?? 0) & MessageFlags.IsComponentsV2);

    if (isComponentsV2) {
      options.data.components ??= [];

      const hasVoteInComponents = (components: any[]): boolean => {
        return components.some((component: any) => {
          const hasVoteText =
            component?.type === MessageComponentTypes.TextDisplay &&
            typeof component?.content === 'string' &&
            component.content.includes('top.gg/bot/1461873695688491190/vote');

          if (hasVoteText) return true;

          if (Array.isArray(component?.components) && component.components.length > 0) {
            return hasVoteInComponents(component.components);
          }

          if (component?.accessory && Array.isArray(component.accessory?.components)) {
            return hasVoteInComponents(component.accessory.components);
          }

          return false;
        });
      };

      const alreadyHasVote = Array.isArray(options.data.components)
        ? hasVoteInComponents(options.data.components)
        : false;

      if (!alreadyHasVote) {
        options.data.components.unshift({
          type: MessageComponentTypes.TextDisplay,
          content: `-# Consider voting for us on **${link('https://top.gg/bot/1461873695688491190/vote', 'top.gg')}**!`,
        });
      }
    } else if (options.data.content) {
      const currentContent =
        typeof options.data.content === 'string' ? options.data.content : String(options.data.content);

      if (!currentContent.includes('top.gg/bot/1461873695688491190/vote')) {
        options.data.content = `-# Consider voting for us on **${link('https://top.gg/bot/1461873695688491190/vote', 'top.gg')}**!\n${currentContent}`;
      }
    }
  }

  return sendInteractionResponse(interactionId, token, options);
};

const editOriginalInteractionResponse = bot.helpers.editOriginalInteractionResponse;

bot.helpers.editOriginalInteractionResponse = async (token, options) => {
  if (options) {
    const isComponentsV2 = Boolean((options.flags ?? 0) & MessageFlags.IsComponentsV2);

    if (isComponentsV2) {
      options.components ??= [];

      const hasVoteInComponents = (components: any[]): boolean => {
        return components.some((component: any) => {
          const hasVoteText =
            component?.type === MessageComponentTypes.TextDisplay &&
            typeof component?.content === 'string' &&
            component.content.includes('top.gg/bot/1461873695688491190/vote');

          if (hasVoteText) return true;

          if (Array.isArray(component?.components) && component.components.length > 0) {
            return hasVoteInComponents(component.components);
          }

          if (component?.accessory && Array.isArray(component.accessory?.components)) {
            return hasVoteInComponents(component.accessory.components);
          }

          return false;
        });
      };

      const alreadyHasVote = Array.isArray(options.components) ? hasVoteInComponents(options.components) : false;

      if (!alreadyHasVote) {
        options.components.unshift({
          type: MessageComponentTypes.TextDisplay,
          content: `-# Consider voting for us on **${link('https://top.gg/bot/1461873695688491190/vote', 'top.gg')}**!`,
        });
      }
    } else {
      const currentContent =
        typeof options.content === 'string' ? options.content : options.content == null ? '' : String(options.content);

      if (!currentContent.includes('top.gg/bot/1461873695688491190/vote')) {
        options.content = currentContent
          ? `-# Consider voting for us on **${link('https://top.gg/bot/1461873695688491190/vote', 'top.gg')}**!\n${currentContent}`
          : `-# Consider voting for us on **${link('https://top.gg/bot/1461873695688491190/vote', 'top.gg')}**!`;
      }
    }
  }

  return editOriginalInteractionResponse(token, options);
};
