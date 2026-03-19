import { FORGE_API_KEY } from 'core/variables';
import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RequestMethod, ResponseType } from 'types/types';
import { icon } from 'utils/markdown';
import { makeRequest } from 'utils/request';
import { Emoji } from 'core/emojis';

createApplicationCommand({
  name: 'item',
  description: 'Views information about the selected item',
  details: {
    category: ApplicationCommandCategory.Forge,
    cooldown: 5,
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  options: [
    {
      name: 'item',
      description: 'Pick an item to view information about',
      type: ApplicationCommandOptionTypes.String,
      required: true,
      autocomplete: true,
    },
  ],
  acknowledge: true,
  async autocomplete(bot, interaction) {
    const focused =
      interaction.data?.options
        ?.find((opt) => opt.focused)
        ?.value?.toString()
        .toLowerCase() ?? '';

    const res = await makeRequest('http://localhost:9998/items', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    const choices = (Array.isArray(res) ? res : [])
      .filter((item: any) =>
        String(item.name ?? '')
          .toLowerCase()
          .includes(focused),
      )
      .slice(0, 25)
      .map((item: any) => ({
        name: String(item.name),
        value: String(item.name),
      }));

    return interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const res = await makeRequest('http://localhost:9998/items', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.item,
      },
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    if (!res || res.error || !res.name) {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon(Emoji.Exclamation)} Item not found.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content:
                `# ${res.name}\n` +
                `- Category: **${res.category ?? 'Unknown'}**\n` +
                (res.price?.formatted ? `- Price: **${res.price.formatted}**\n` : '') +
                (res.description ? `\n*${res.description}*` : '') +
                (res.effects && typeof res.effects === 'object' && Object.keys(res.effects).length
                  ? `\n\n## Effects\n${Object.entries(res.effects)
                      .map(([key, value]) => `- ${String(key)}: **${String(value)}**`)
                      .join('\n')}`
                  : ''),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
