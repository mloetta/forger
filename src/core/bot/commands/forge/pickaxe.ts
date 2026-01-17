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
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Forge,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'pickaxe',
      description: 'Pick a pickaxe to view',
      required: true,
    },
  ],
  acknowledge: true,
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9999/pickaxes`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': BOT_TOKEN,
      },
      params: {
        name: options.pickaxe,
      },
    });

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `# ${res.name} - ${res.ore}\n-# ${res.rarity}`,
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
