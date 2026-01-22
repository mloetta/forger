import { BOT_TOKEN } from 'core/variables';
import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory } from 'types/types';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';

createApplicationCommand({
  name: 'pickaxe',
  description: 'View pickaxe details',
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
      type: ApplicationCommandOptionTypes.String,
      name: 'pickaxe',
      description: 'Pick a pickaxe to view',
      required: true,
      autocomplete: true,
    },
  ],
  acknowledge: true,
  async autocomplete(bot, interaction, options) {
    const focused =
      interaction.data?.options
        ?.find((opt) => opt.focused)
        ?.value?.toString()
        .toLowerCase() ?? '';

    const res = await makeRequest('http://localhost:9999/pickaxes', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': BOT_TOKEN,
      },
    });

    const choices = res
      .filter((pickaxe: any) => {
        if (!focused) return true;

        return pickaxe.name.toLowerCase().includes(focused);
      })
      .slice(0, 25)
      .map((pickaxe: any) => ({
        name: pickaxe.name,
        value: pickaxe.name,
      }));

    return interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9999/pickaxes`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.pickaxe,
      },
      headers: {
        'x-api-key': BOT_TOKEN,
      },
    });

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `# ${res.name} (${res.ore})\n-# ${res.rarity}`,
            },
            {
              type: MessageComponentTypes.Section,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `*${res.description}*`,
                },
              ],
              accessory: {
                type: MessageComponentTypes.Thumbnail,
                media: {
                  url: res.image,
                },
              },
            },
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.StringSelect,
                  customId: 'highest-mineable',
                  placeholder: 'Highest Mineable Rock',
                  options: [
                    {
                      label: res.highest_mineable.name,
                      value: res.highest_mineable.name.toLowerCase().replace(/\s+/g, '_'),
                      description: `Minimum Base Damage Required: ${res.highest_mineable.minimum_base_damage}`,
                    },
                  ],
                },
              ],
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: (() => {
                const lines = [
                  `## Information`,
                  `- Mine Power: **${res.mine_power}**`,
                  res.mine_speed !== undefined ? `- Mine Speed: **${res.mine_speed}%**` : null,
                  res.luck_boost !== undefined ? `- Luck Boost: **${res.luck_boost}%**` : null,
                  res.rune_slots !== undefined ? `- Rune Slots: **${res.rune_slots}**` : null,
                  res.rune_price !== undefined ? `- Rune Price: **$${res.rune_price.toLocaleString('en-US')}**` : null,
                  res.price !== undefined ? `- Price: **$${res.price.toLocaleString('en-US')}**` : null,
                  res.tickets !== undefined ? `- Tickets: **${res.tickets.toLocaleString('en-US')}**` : null,
                  res.goblin_price !== undefined
                    ? `- Goblin Price: **$${res.goblin_price.toLocaleString('en-US')}**`
                    : null,
                  res.sell_price !== undefined ? `- Sell Price: **$${res.sell_price.toLocaleString('en-US')}**` : null,
                ].filter(Boolean);

                return lines.join('\n');
              })(),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
