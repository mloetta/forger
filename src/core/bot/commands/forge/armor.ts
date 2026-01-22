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
  name: 'armor',
  description: 'View weapon details',
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
      name: 'armor',
      description: 'Pick an armor to view',
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

    const res = await makeRequest('http://localhost:9999/armors', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': BOT_TOKEN,
      },
    });

    const variants = res.flatMap((armor: any) =>
      armor.variants.map((variant: any) => ({
        name: variant.name,
        value: variant.name,
      })),
    );

    const choices = variants.filter((v: any) => !focused || v.name.toLowerCase().includes(focused)).slice(0, 25);

    return interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9999/armors`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.armor,
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
                  content: `# ${res.name} (${res.type})`,
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
                  customId: 'armor-location',
                  placeholder: 'Obtainable From',
                  options: res.from.map((item: any) => ({
                    label: item,
                    value: item.toLowerCase().replace(/\s+/g, '_'),
                  })),
                },
              ],
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Information\n- Health: **${res.health.toLocaleString('en-US', { style: 'percent' })}**\n- Chance: **${decimalToFraction(res.chance)}**\n- Minimum Ore Requirement: **${res.min_ores.toLocaleString('en-US')}**\n- Base Price: **$${res.base_price.toLocaleString('en-US')}**`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
