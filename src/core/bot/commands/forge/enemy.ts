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

createApplicationCommand({
  name: 'enemy',
  description: 'Views information about the selected enemy',
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
      name: 'enemy',
      description: 'Pick an enemy to view information about',
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

    const res = await makeRequest('http://localhost:9998/enemies', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    const choices = res
      .filter((enemy: any) => {
        if (!focused) return true;

        return enemy.name.toLowerCase().includes(focused);
      })
      .slice(0, 25)
      .map((enemy: any) => ({
        name: enemy.name,
        value: enemy.name,
      }));

    return interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9998/enemies`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.enemy,
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
                  content: `# ${res.name}\n *${res.description}*`,
                },
              ],
              accessory: {
                type: MessageComponentTypes.Thumbnail,
                media: {
                  url: res.image,
                },
              },
            },
            ...(res.location && res.location.length > 0
              ? ([
                  {
                    type: MessageComponentTypes.ActionRow,
                    components: [
                      {
                        type: MessageComponentTypes.StringSelect,
                        customId: 'mob-locations',
                        placeholder: 'Locations:',
                        options: res.location.flatMap((loc: any) =>
                          loc.world.map((world: string) => ({
                            label: world,
                            value: world,
                            ...(loc.area ? { description: loc.area.join(', ') } : {}),
                          })),
                        ),
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
              content: `- Level Range: **${res.level_range.min ?? '?'} - ${res.level_range.max ?? '?'}**\n- Health: **${res.health.min ?? '?'} - ${res.health.max ?? '?'}**\n- Damage: **${res.damage.min ?? '?'} - ${res.damage.max ?? '?'}**\n- Gold: **${res.gold.min ?? '?'} - ${res.gold.max ?? '?'}**\n- Experience: **${res.experience.min ?? '?'} - ${res.experience.max ?? '?'}**`,
            },
            ...(res.drops && res.drops.length > 0
              ? ([
                  {
                    type: MessageComponentTypes.Separator,
                  },
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${res.drops.map((drop: any) => `- ${drop.item} - **${drop.chance}**`).join('\n')}`,
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
