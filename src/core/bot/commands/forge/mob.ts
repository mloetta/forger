import { FORGE_API_KEY } from 'core/variables';
import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  type MessageComponents,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RequestMethod, ResponseType } from 'types/types';
import { makeRequest } from 'utils/request';
import { decimalToFraction } from 'utils/utils';

createApplicationCommand({
  name: 'mob',
  description: 'View mob details',
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
      name: 'mob',
      description: 'Pick a mob to view',
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

    const res = await makeRequest('http://localhost:9998/mobs', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    const choices = res
      .filter((mob: any) => {
        if (!focused) return true;

        return mob.name.toLowerCase().includes(focused);
      })
      .slice(0, 25)
      .map((mob: any) => ({
        name: mob.name,
        value: mob.name,
      }));

    return interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9998/mobs`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.mob,
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
                  content: `# ${res.name}\n-# ${res.world} - ${res.area}${res.overview ? `\n> *${res.overview}*` : ''}`,
                },
              ],
              accessory: {
                type: MessageComponentTypes.Thumbnail,
                media: {
                  url: res.image,
                },
              },
            },
            ...(res.locations && res.locations.length > 0
              ? ([
                  {
                    type: MessageComponentTypes.ActionRow,
                    components: [
                      {
                        type: MessageComponentTypes.StringSelect,
                        customId: 'mob-locations',
                        placeholder: 'Locations:',
                        options: res.locations.map((loc: string) => ({
                          label: loc,
                          value: loc,
                        })),
                      },
                    ],
                  },
                ] satisfies MessageComponents)
              : []),
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Stats:\n- Level Range: **${res.level_range.min.toLocaleString('en-US') ?? '?'} - ${res.level_range.max.toLocaleString('en-US') ?? '?'}**\n- Health: **${res.stats.health.min.toLocaleString('en-US') ?? '?'} - ${res.stats.health.max.toLocaleString('en-US') ?? '?'}**\n- Damage: **${res.stats.damage.min.toLocaleString('en-US') ?? '?'} - ${res.stats.damage.max.toLocaleString('en-US') ?? '?'}**\n- Gold: **${res.stats.gold.min.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) ?? '?'} - ${res.stats.gold.max.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) ?? '?'}**\n- Experience: **${res.stats.experience.min.toLocaleString('en-US') ?? '?'} - ${res.stats.experience.max.toLocaleString('en-US') ?? '?'}**`,
            },
            ...(res.drops && res.drops.length > 0
              ? ([
                  {
                    type: MessageComponentTypes.Separator,
                  },
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `## Drops:\n${res.drops.map((drop: any) => `- ${drop.item} - **${decimalToFraction(drop.chance)}**`).join('\n')}`,
                  },
                ] satisfies MessageComponents)
              : []),
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
