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
      name: 'ore',
      description: 'Pick an ore to view',
      type: ApplicationCommandOptionTypes.String,
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

    const res = await makeRequest('http://localhost:9999/ores', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': BOT_TOKEN,
      },
    });

    const choices = res
      .filter((ore: any) => {
        if (!focused) return true;

        return ore.name.toLowerCase().includes(focused);
      })
      .slice(0, 25)
      .map((ore: any) => ({
        name: ore.name,
        value: ore.name,
      }));

    return interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9999/ores`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.ore,
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
              type: MessageComponentTypes.Section,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `# ${res.name}\n-# ${res.rarity}`,
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
              type: MessageComponentTypes.TextDisplay,
              content: `*${res.description}*${typeof res.trait === 'string' ? `\n> ${res.trait}` : `\n-# *${res.trait.type}*\n> *${res.trait.description}*`}`,
            },
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.StringSelect,
                  customId: 'ore-location',
                  placeholder: 'Obtainable From',
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
              content: `## Information
- Chance: **${decimalToFraction(res.chance)}**
- Multiplier: **${res.multiplier.toLocaleString('en-US')}x**
- Price: **$${res.price.toLocaleString('en-US')}**${
                res.unique_price_multiplier != null
                  ? `\n- Unique Price Multiplier: **${res.unique_price_multiplier.toLocaleString('en-US')}x**`
                  : ''
              }`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
