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
import { decimalToFraction } from 'utils/utils';

createApplicationCommand({
  name: 'ore',
  description: 'View ore details',
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
      name: 'ore',
      description: 'Pick an ore to view',
      type: ApplicationCommandOptionTypes.String,
      required: true,
    },
  ],
  acknowledge: true,
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9999/ores`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': BOT_TOKEN,
      },
      params: {
        name: options.ore,
      },
    });

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `# ${res.name}\n-# ${res.rarity}`,
            },
            {
              type: MessageComponentTypes.Section,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `*${res.description}*${typeof res.trait === 'string' ? `\n-# ${res.trait}` : `\n-# *${res.trait.type}*\n-# *${res.trait.min}*\n-# *${res.trait.max}*`}`,
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
                  customId: 'ore-location',
                  placeholder: 'Mining Zones',
                  options: res.obtainable_from.map((item: any) => ({
                    label: item.area,
                    value: item.area.toLowerCase().replace(/\s+/g, '_'),
                    description: item.from.join(', '),
                  })),
                },
              ],
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Information\n- Chance: **${decimalToFraction(res.chance)}**\n- Multiplier: **${res.multiplier}x**\n- Price: **$${res.price}**`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
