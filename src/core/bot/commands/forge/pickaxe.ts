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
import { makeRequest } from 'utils/request';

createApplicationCommand({
  name: 'pickaxe',
  description: 'Views information about the selected pickaxe',
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
      description: 'Pick a pickaxe to view information about',
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

    const res = await makeRequest('http://localhost:9998/pickaxes', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
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
    const res = await makeRequest(`http://localhost:9998/pickaxes`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.pickaxe,
      },
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.Section,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `# ${res.name}\n-# ${res.rarity}\n*${res.description}*`,
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
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: [
                `- Mine Power: **${res.mine_power}**`,
                res.mine_speed ? `- Mine Speed: **${res.mine_speed}**` : '',
                res.luck_boost ? `- Luck Boost: **${res.luck_boost}**` : '',
                res.rune_slots ? `- Rune Slots: **${res.rune_slots}**` : '',
                res.rune_price ? `- Rune Price: **${res.rune_price}**` : '',
                res.price ? `- Price: **${res.price}**` : '',
                res.tickets ? `- Tickets: **${res.tickets}**` : '',
                res.goblin_price ? `- Goblin Price: **${res.goblin_price}**` : '',
                res.sell_price ? `- Sell Price: **${res.sell_price}**` : '',
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
