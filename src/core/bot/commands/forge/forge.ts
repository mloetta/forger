import { FORGE_API_KEY } from 'core/variables';
import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  type ActionRow,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RequestMethod, ResponseType } from 'types/types';
import { stringwrapPreserveWords } from 'utils/markdown';
import { makeRequest } from 'utils/request';

createApplicationCommand({
  name: 'forge',
  description: 'Forge a weapon or armor',
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
      name: 'recipe',
      description: 'Recipe to forge (e.g., 3 gargantuan, 3 golem heart, 3 voidstar)',
      required: true,
    },
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'category',
      description: 'Category of the item (e.g., Gauntlet, Heavy Armor)',
      required: true,
      autocomplete: true,
    },
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'variant',
      description: "Variant of the item (e.g., Dark Knight's Gauntlets, Goblin's Crown)",
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

    const [weaponsRes, armorsRes] = await Promise.all([
      makeRequest('http://localhost:9998/weapons', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      }),

      makeRequest('http://localhost:9998/armors', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      }),
    ]);

    if (interaction.data?.options?.some((opt) => opt.name === 'category' && opt.focused)) {
      const categories = [...new Set([...weaponsRes.map((w: any) => w.type), ...armorsRes.map((a: any) => a.type)])];

      const choices = categories
        .filter((cat) => !focused || cat.toLowerCase().includes(focused))
        .slice(0, 25)
        .map((cat) => ({ name: cat, value: cat }));

      return interaction.respond({ choices });
    }

    if (interaction.data?.options?.some((opt) => opt.name === 'variant' && opt.focused)) {
      const category = options.category;
      if (!category) return interaction.respond({ choices: [] });

      const variants = [
        ...weaponsRes
          .filter((w: any) => w.type === category)
          .flatMap((w: any) => Object.values(w.variants).map((v: any) => ({ name: v.name, value: v.name }))),
        ...armorsRes
          .filter((a: any) => a.type === category)
          .flatMap((a: any) => Object.values(a.variants).map((v: any) => ({ name: v.name, value: v.name }))),
      ];

      const choices = variants.filter((v) => !focused || v.name.toLowerCase().includes(focused)).slice(0, 25);

      return interaction.respond({ choices });
    }
  },
  async run(bot, interaction, options) {
    const armorsRes = await makeRequest('http://localhost:9998/armors', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    let mode: 'Weapon' | 'Armor' = 'Weapon';
    if (armorsRes.some((a: any) => a.type === options.category)) mode = 'Armor';

    const res = await makeRequest('http://localhost:9998/forge', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      body: {
        recipe: options.recipe,
        category: options.category,
        variant: options.variant,
        mode,
      },
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FORGE_API_KEY,
      },
    });

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `# ${res.name}`,
            },
            {
              type: MessageComponentTypes.Section,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `> *${res.recipe}*\n ${res.ore_percentages.map((item: any) => `> *${item.ore} (${item.percentage})*`).join('\n')}`,
                },
              ],
              accessory: {
                type: MessageComponentTypes.Thumbnail,
                media: { url: res.image },
              },
            },
            ...(res.traits && res.traits.length > 0
              ? [
                  {
                    type: MessageComponentTypes.ActionRow,
                    components: [
                      {
                        type: MessageComponentTypes.StringSelect,
                        customId: 'active-traits',
                        placeholder: 'Active Traits',
                        options: res.traits.map((item: any) => ({
                          label: item.ore,
                          value: item.ore.toLowerCase().replace(/\s+/g, '_'),
                          description: stringwrapPreserveWords(item.trait, 100),
                        })),
                      },
                    ],
                  } satisfies ActionRow,
                ]
              : []),
            { type: MessageComponentTypes.Separator },
            {
              type: MessageComponentTypes.TextDisplay,
              content: (() => {
                const lines = [
                  `## Information:`,
                  res.avg_multi !== undefined ? `- Multiplier: **${res.avg_multi}x**` : null,
                  res.base_damage !== undefined ? `- Base Damage: **${res.base_damage}**` : null,
                  res.attack_speed !== undefined ? `- Attack Speed: **${res.attack_speed}s**` : null,
                  res.effective_dps !== undefined ? `- Effective DPS: **${res.effective_dps}**` : null,
                  res.avg_damage_per_hit !== undefined
                    ? `- Average Damage per Hit: **${res.avg_damage_per_hit}**`
                    : null,
                  res.defense !== undefined ? `- Defense: **${res.defense}**` : null,
                  `- Total Ores: **${res.total_ores}**`,
                  res.sell_price !== undefined ? `- Sell Price: **$${res.sell_price}**` : null,
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
