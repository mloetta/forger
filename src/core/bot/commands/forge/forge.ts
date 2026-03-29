import { collectors } from 'bot/events/interactions';
import { FORGE_API_KEY } from 'core/variables';
import {
  ButtonStyles,
  Collection,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  TextStyles,
  type MessageComponents,
} from 'discordeno';
import createCollector from 'helpers/collector';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RequestMethod, ResponseType, type Interaction } from 'types/types';
import { randomUUID } from 'crypto';
import { icon, pill, smallPill, stringwrapPreserveWords } from 'utils/markdown';
import { makeRequest } from 'utils/request';
import { Emoji } from 'core/emojis';

// Remake the whole rune system at some point

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
  acknowledge: true,
  async run(bot, interaction, options) {
    const ores = await makeRequest('http://localhost:9998/ores', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    const totalOres = ores.length;
    const totalPages = Math.ceil(totalOres / 25);

    const message = await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: '# Forge Calculator',
            },
            {
              type: MessageComponentTypes.Section,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: "Press the button on the right when you're ready to forge!",
                },
              ],
              accessory: {
                type: MessageComponentTypes.Button,
                customId: 'forge',
                label: 'Forge',
                style: ButtonStyles.Success,
              },
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: 'Select the type of your equipment and the ores you want to use.',
            },
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.StringSelect,
                  customId: 'equipment-type',
                  placeholder: 'Available Equipment Types:',
                  options: [
                    { label: 'Weapon', value: 'Weapon' },
                    { label: 'Armor', value: 'Armor' },
                  ],
                },
              ],
            },
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.StringSelect,
                  customId: 'ores-selection',
                  placeholder: 'Available Ores:',
                  options: ores.slice(0, 25).map((ore: any) => ({
                    label: ore.name,
                    value: ore.name,
                    description: `${ore.multiplier}x`,
                  })),
                },
              ],
            },
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.Button,
                  customId: 'view-more-ores',
                  label: 'View More Ores',
                  style: ButtonStyles.Secondary,
                },
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = createCollector<Interaction>({
      key: 'forge-v2',
      // @ts-ignore
      filter: (i) => i.message?.id === message.id && i.user.id === interaction.user.id,
      duration: 3 * 60 * 1000,
    });
    collectors.add(collector);

    type SelectionData = {
      ores?: Record<string, number>;
      lastSelectedOre?: string;
      currentPage?: number;
      world?: string;
      equipmentType?: string;
      category?: string;
      variant?: string;
      race?: string;
      achievement?: {
        name: string;
        stage: number;
      };
      lethality?: number;
      quality?: number;
      enhancement?: number;
      runes?: {
        id: string;
        rune: string;
        roll: Record<string, number>;
        subtraits?: {
          subtrait: string;
          roll: Record<string, number>;
        }[];
      }[];
      runeTemp?: {
        name?: string;
        id?: string;
        fieldMapping?: Record<string, string>;
        ranges?: Record<string, { min: number; max: number }>;
      };
      equipmentRuneSlots?: number;
    };

    const selections = new Collection<string, SelectionData>();

    const handlers = new Collection<string, (i: Interaction) => Promise<void>>();
    handlers.set('equipment-type', async (i) => {
      if (!i.data) return;

      const selectedType = String(i.data.values?.[0]);
      if (!selectedType) return;

      const data = selections.get(i.user.id.toString()) ?? {};
      const currentPage = data.currentPage ?? 0;

      data.equipmentType = selectedType;
      selections.set(i.user.id.toString(), data);

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Forge Calculator',
              },
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: "Press the button on the right when you're ready to forge!",
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'forge',
                  label: 'Forge',
                  style: ButtonStyles.Success,
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              ...(data &&
              (data.equipmentType || Object.keys(data.ores ?? {}).length > 0 || data.race || data.achievement)
                ? ([
                    ...(data.equipmentType
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Type:\n- ${data.equipmentType}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(Object.keys(data.ores ?? {}).length > 0
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Ores:\n${Object.entries(data.ores ?? {})
                              .map(([ore, amount]) => `- ${ore}: **${amount}**`)
                              .join('\n')}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.race
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Race:\n- ${data.race}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.achievement && data.achievement.stage !== undefined
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Achievement:\n- ${data.achievement.name} (${data.achievement.stage})`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.lethality && data.lethality !== undefined
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Lethality:\n- ${data.lethality}%`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.TextDisplay,
                content: 'Select the type of your equipment and the ores you want to use.',
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'equipment-type',
                    placeholder: 'Available Equipment Types:',
                    options: [
                      { label: 'Weapon', value: 'Weapon' },
                      { label: 'Armor', value: 'Armor' },
                    ],
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'ores-selection',
                    placeholder: 'Available Ores:',
                    options: ores.slice(currentPage * 25, currentPage * 25 + 25).map((ore: any) => ({
                      label: ore.name,
                      value: ore.name,
                      description: `${ore.multiplier}x`,
                    })),
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-more-ores',
                    label: 'View More Ores',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
              ...(data.equipmentType === 'Weapon'
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Click the button on the right to view more options.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'view-more-options',
                        label: 'Extra',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('ores-selection', async (i) => {
      if (!i.data) return;

      const selectedOre = String(i.data.values?.[0]);
      if (!selectedOre) return;

      const data = selections.get(i.user.id.toString()) ?? {};

      if (Object.keys(data.ores ?? {}).length >= 4 && !(selectedOre in (data.ores ?? {}))) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} You can only select up to ${smallPill('4')} different ores.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      data.lastSelectedOre = selectedOre;
      selections.set(i.user.id.toString(), data);

      await i.respond({
        customId: 'ore-amount',
        title: 'Ore Amount',
        components: [
          {
            type: MessageComponentTypes.Label,
            label: 'Type the amount of the selected ore.',
            component: {
              type: MessageComponentTypes.TextInput,
              customId: 'ore-amount-input',
              placeholder: 'Only numbers are allowed.',
              style: TextStyles.Short,
              required: true,
            },
          },
        ],
      });
    });
    handlers.set('ore-amount', async (i) => {
      if (!i.data) return;

      const selectedOreAmount =
        typeof i.data.components?.[0]?.component?.value === 'string' &&
        !Number.isNaN(Number(i.data.components?.[0]?.component?.value))
          ? Number(i.data.components?.[0]?.component?.value)
          : undefined;

      const data = selections.get(i.user.id.toString());
      if (!data) return;
      const currentPage = data.currentPage ?? 0;

      if (!selectedOreAmount || !Number.isInteger(selectedOreAmount)) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} Invalid amount. Please enter a valid number.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (selectedOreAmount <= 0) {
        if ((data.lastSelectedOre ?? '') in (data.ores ?? {})) {
          delete (data.ores ??= {})[data.lastSelectedOre ?? ''];
          selections.set(i.user.id.toString(), data);
        } else {
          await i.respond({
            components: [
              {
                type: MessageComponentTypes.Container,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${icon(Emoji.Wrong)} Cannot remove ore that doesn't exist in your selection.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });

          return;
        }
      } else if (selectedOreAmount >= 200) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} You cannot select more than ${smallPill('200')} ores.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      } else {
        (data.ores ??= {})[data.lastSelectedOre ?? ''] = selectedOreAmount;
        selections.set(i.user.id.toString(), data);
      }

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Forge Calculator',
              },
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: "Press the button on the right when you're ready to forge!",
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'forge',
                  label: 'Forge',
                  style: ButtonStyles.Success,
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              ...(data &&
              (data.equipmentType || Object.keys(data.ores ?? {}).length > 0 || data.race || data.achievement)
                ? ([
                    ...(data.equipmentType
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Type:\n- ${data.equipmentType}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(Object.keys(data.ores ?? {}).length > 0
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Ores:\n${Object.entries(data.ores ?? {})
                              .map(([ore, amount]) => `- ${ore}: **${amount}**`)
                              .join('\n')}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.race
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Race:\n- ${data.race}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.achievement && data.achievement.stage !== undefined
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Achievement:\n- ${data.achievement.name} (${data.achievement.stage})`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.lethality && data.lethality !== undefined
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Lethality:\n- ${data.lethality}%`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.TextDisplay,
                content: 'Select the type of your equipment and the ores you want to use.',
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'equipment-type',
                    placeholder: 'Available Equipment Types:',
                    options: [
                      { label: 'Weapon', value: 'Weapon' },
                      { label: 'Armor', value: 'Armor' },
                    ],
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'ores-selection',
                    placeholder: 'Available Ores:',
                    options: ores.slice(currentPage * 25, currentPage * 25 + 25).map((ore: any) => ({
                      label: ore.name,
                      value: ore.name,
                      description: `${ore.multiplier}x`,
                    })),
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-more-ores',
                    label: 'View More Ores',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
              ...(data.equipmentType === 'Weapon'
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Click the button on the right to view more options.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'view-more-options',
                        label: 'Extra',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('view-more-ores', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString()) ?? {};
      data.currentPage = ((data.currentPage ?? 0) + 1) % totalPages;
      selections.set(i.user.id.toString(), data);
      const currentPage = data.currentPage;

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Forge Calculator',
              },
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: "Press the button on the right when you're ready to forge!",
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'forge',
                  label: 'Forge',
                  style: ButtonStyles.Success,
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              ...(data &&
              (data.equipmentType || Object.keys(data.ores ?? {}).length > 0 || data.race || data.achievement)
                ? ([
                    ...(data.equipmentType
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Type:\n- ${data.equipmentType}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(Object.keys(data.ores ?? {}).length > 0
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Ores:\n${Object.entries(data.ores ?? {})
                              .map(([ore, amount]) => `- ${ore}: **${amount}**`)
                              .join('\n')}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.race
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Race:\n- ${data.race}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.achievement && data.achievement.stage !== undefined
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Achievement:\n- ${data.achievement.name} (${data.achievement.stage})`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.lethality && data.lethality !== undefined
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Lethality:\n- ${data.lethality}%`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.TextDisplay,
                content: 'Select the type of your equipment and the ores you want to use.',
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'equipment-type',
                    placeholder: 'Available Equipment Types:',
                    options: [
                      { label: 'Weapon', value: 'Weapon' },
                      { label: 'Armor', value: 'Armor' },
                    ],
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'ores-selection',
                    placeholder: 'Available Ores:',
                    options: ores.slice(currentPage * 25, currentPage * 25 + 25).map((ore: any) => ({
                      label: ore.name,
                      value: ore.name,
                      description: `${ore.multiplier}x`,
                    })),
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-more-ores',
                    label: 'View More Ores',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
              ...(data.equipmentType === 'Weapon'
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Click the button on the right to view more options.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'view-more-options',
                        label: 'Extra',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('view-more-options', async (i) => {
      if (!i.data) return;

      const races = await makeRequest('http://localhost:9998/races', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      const achievements = await makeRequest('http://localhost:9998/achievements', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      await i.respond({
        customId: 'extra-options',
        title: 'Extra Options',
        components: [
          {
            type: MessageComponentTypes.Label,
            label: 'Select a race',
            component: {
              type: MessageComponentTypes.StringSelect,
              customId: 'race-selection.',
              placeholder: 'Available Races:',
              options: races.map((race: any) => ({
                label: race.name,
                value: race.name,
                description: race.rarity,
              })),
              required: false,
            },
          },
          {
            type: MessageComponentTypes.Label,
            label: 'Select an achievement',
            component: {
              type: MessageComponentTypes.StringSelect,
              customId: 'achievement-selection.',
              placeholder: 'Available Achievements:',
              options: achievements.map((achievement: any) => ({
                label: achievement.name,
                value: achievement.name,
                description: achievement.type,
              })),
              required: false,
            },
          },
          {
            type: MessageComponentTypes.Label,
            label: 'Enter a stage for the achievement',
            component: {
              type: MessageComponentTypes.TextInput,
              customId: 'achievement-stage',
              placeholder: 'Choose a value between 1 and 5',
              style: TextStyles.Short,
              required: false,
            },
          },
          {
            type: MessageComponentTypes.Label,
            label: 'Enter a lethality value',
            component: {
              type: MessageComponentTypes.TextInput,
              customId: 'lethality',
              placeholder: 'Choose a value between 1% and 150%',
              style: TextStyles.Short,
              required: false,
            },
          },
        ],
      });
    });
    handlers.set('extra-options', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString()) ?? {};
      const currentPage = data.currentPage ?? 0;

      const selectedRace =
        typeof i.data.components?.[0]?.component?.values?.[0] === 'string'
          ? i.data.components[0].component.values[0]
          : undefined;

      const selectedAchievement =
        typeof i.data.components?.[1]?.component?.values?.[0] === 'string'
          ? i.data.components[1].component.values[0]
          : undefined;

      const selectedAchievementStage =
        typeof i.data.components?.[2]?.component?.value === 'string' &&
        !Number.isNaN(Number(i.data.components[2].component.value))
          ? Number(i.data.components[2].component.value)
          : undefined;

      const selectedLethality =
        typeof i.data.components?.[3]?.component?.value === 'string' &&
        !Number.isNaN(Number.parseFloat(i.data.components[3].component.value))
          ? Number.parseFloat(i.data.components[3].component.value)
          : undefined;

      if (!selectedRace && !selectedAchievement && !selectedLethality) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} Please provide a ${smallPill('race')}, ${smallPill('achievement')}, or ${smallPill('lethality')}.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (selectedAchievement && !selectedAchievementStage) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} Please select a ${smallPill('stage')} for the achievement.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (
        selectedAchievement !== undefined &&
        selectedAchievementStage !== undefined &&
        (!Number.isInteger(selectedAchievementStage) || selectedAchievementStage < 1 || selectedAchievementStage > 5)
      ) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} Please provide a stage for the achievement from ${smallPill('1')} to ${smallPill('5')}.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (
        selectedLethality &&
        (!Number.isInteger(selectedLethality) || selectedLethality < 1 || selectedLethality > 150)
      ) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} Please provide a lethality value between ${smallPill('1%')} and ${smallPill('150%')}.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      data.race = selectedRace;
      selectedAchievement !== undefined && selectedAchievementStage !== undefined
        ? (data.achievement = {
            name: selectedAchievement,
            stage: selectedAchievementStage,
          })
        : (data.achievement = undefined);
      data.lethality = selectedLethality;

      selections.set(i.user.id.toString(), data);

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Forge Calculator',
              },
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: "Press the button on the right when you're ready to forge!",
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'forge',
                  label: 'Forge',
                  style: ButtonStyles.Success,
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              ...(data &&
              (data.equipmentType || Object.keys(data.ores ?? {}).length > 0 || data.race || data.achievement)
                ? ([
                    ...(data.equipmentType
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Type:\n- ${data.equipmentType}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(Object.keys(data.ores ?? {}).length > 0
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Ores:\n${Object.entries(data.ores ?? {})
                              .map(([ore, amount]) => `- ${ore}: **${amount}**`)
                              .join('\n')}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.race
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Race:\n- ${data.race}`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.achievement && data.achievement.stage !== undefined
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Achievement:\n- ${data.achievement.name} (${data.achievement.stage})`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    ...(data.lethality && data.lethality !== undefined
                      ? ([
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `### Selected Lethality:\n- ${data.lethality}%`,
                          },
                        ] satisfies MessageComponents)
                      : []),
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.TextDisplay,
                content: 'Select the type of your equipment and the ores you want to use.',
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'equipment-type',
                    placeholder: 'Available Equipment Types:',
                    options: [
                      { label: 'Weapon', value: 'Weapon' },
                      { label: 'Armor', value: 'Armor' },
                    ],
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'ores-selection',
                    placeholder: 'Available Ores:',
                    options: ores.slice(currentPage * 25, currentPage * 25 + 25).map((ore: any) => ({
                      label: ore.name,
                      value: ore.name,
                      description: `${ore.multiplier}x`,
                    })),
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-more-ores',
                    label: 'View More Ores',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
              ...(data.equipmentType === 'Weapon'
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Click the button on the right to view more options.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'view-more-options',
                        label: 'Extra',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('forge', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} Please select an ${smallPill('equipment type')} and provide at least ${smallPill('3')} ores.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (!data.equipmentType) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} Please select an ${smallPill('equipment type')}.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      const total = Object.values(data.ores ?? {}).reduce((sum, amount) => sum + amount, 0);
      if (!total || total < 3) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} Please select at least ${smallPill('3')} ores.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      const equipmentChance =
        data.equipmentType === 'Weapon'
          ? await makeRequest(`http://localhost:9998/forge/weapon-chance`, {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              params: {
                world: data.world ?? "Stonewake's Cross",
                ores_total: total.toString(),
              },
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            })
          : await makeRequest(`http://localhost:9998/forge/armor-chance`, {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              params: {
                world: data.world ?? "Stonewake's Cross",
                ores_total: total.toString(),
              },
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            });

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Forge Results',
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `> *${Object.entries(data.ores ?? {})
                  .map(([ore, amount]) => `${amount} ${ore}`)
                  .join(', ')}*
                  ${Object.entries(data.ores ?? {})
                    .map(([ore, amount]) => `> *${ore} ${Math.round((amount / total) * 100)}%*`)
                    .join('\n')}`,
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `### You can change the world to forge new ${data.equipmentType}s!\nSelected World:\n- Stonewake's Cross`,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'change-world',
                    placeholder: 'Change the world for different results.',
                    options: [
                      {
                        label: 'Forgotten Kingdom',
                        value: 'Forgotten Kingdom',
                      },
                      {
                        label: 'Frostspire Expanse',
                        value: 'Frostspire Expanse',
                      },
                      {
                        label: 'Crimson Sakura',
                        value: 'Crimson Sakura',
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
                content: equipmentChance.chances
                  .map(
                    (e: any) =>
                      `- ${e.name} **(${e.chance_rounded_1dp})** - Min Ores: **${e.min_ores}**, Lockable: **${e.lockable}**`,
                  )
                  .join('\n'),
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'select-category',
                    placeholder: 'Select the desired category for your equipment.',
                    options: equipmentChance.chances.map((c: any) => ({
                      label: c.name,
                      value: c.name,
                    })),
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('change-world', async (i) => {
      if (!i.data) return;

      const selectedWorld = String(i.data.values?.[0]);
      if (!selectedWorld) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      data.world = selectedWorld;
      selections.set(i.user.id.toString(), data);

      const total = Object.values(data.ores ?? {}).reduce((sum, amount) => sum + amount, 0);
      if (!total) return;

      const equipmentChance =
        data.equipmentType === 'Weapon'
          ? await makeRequest(`http://localhost:9998/forge/weapon-chance`, {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              params: {
                world: data.world ?? "Stonewake's Cross",
                ores_total: total.toString(),
              },
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            })
          : await makeRequest(`http://localhost:9998/forge/armor-chance`, {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              params: {
                world: data.world ?? "Stonewake's Cross",
                ores_total: total.toString(),
              },
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            });

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Forge Results',
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `> *${Object.entries(data.ores ?? {})
                  .map(([ore, amount]) => `${amount} ${ore}`)
                  .join(', ')}*
                  ${Object.entries(data.ores ?? {})
                    .map(([ore, amount]) => `> *${ore} ${Math.round((amount / total) * 100)}%*`)
                    .join('\n')}`,
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `### You can change the world to forge new ${data.equipmentType}s!\nSelected World:\n- ${data.world ?? "Stonewake's Cross"}`,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'change-world',
                    placeholder: 'Change the world for different results.',
                    options: [
                      {
                        label: "Stonewake's Cross",
                        value: "Stonewake's Cross",
                      },
                      {
                        label: 'Forgotten Kingdom',
                        value: 'Forgotten Kingdom',
                      },
                      {
                        label: 'Frostspire Expanse',
                        value: 'Frostspire Expanse',
                      },
                      {
                        label: 'Crimson Sakura',
                        value: 'Crimson Sakura',
                      },
                    ].filter((option) => option.value !== data.world),
                  },
                ],
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: equipmentChance.chances
                  .map(
                    (w: any) =>
                      `- ${w.name} **(${w.chance_rounded_1dp})** - Min Ores: **${w.min_ores}**, Lockable: **${w.lockable}**`,
                  )
                  .join('\n'),
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'select-category',
                    placeholder: 'Select the desired category for your equipment.',
                    options: equipmentChance.chances.map((c: any) => ({
                      label: c.name,
                      value: c.name,
                    })),
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('select-category', async (i) => {
      if (!i.data) return;

      const selectedCategory = String(i.data.values?.[0]);

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      data.category = selectedCategory;

      const total = Object.values(data.ores ?? {}).reduce((sum, amount) => sum + amount, 0);
      if (!total) return;

      const equipmentChance =
        data.equipmentType === 'Weapon'
          ? await makeRequest(`http://localhost:9998/forge/weapon-chance`, {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              params: {
                world: data.world ?? "Stonewake's Cross",
                ores_total: total.toString(),
              },
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            })
          : await makeRequest(`http://localhost:9998/forge/armor-chance`, {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              params: {
                world: data.world ?? "Stonewake's Cross",
                ores_total: total.toString(),
              },
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            });

      const selectedChance = equipmentChance.chances.find((c: any) => c.name === selectedCategory);
      const minOres = selectedChance.min_ores;

      if (total < minOres) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} Insufficient ores to forge ${pill(selectedCategory)}. Minimum required: ${smallPill(minOres)}. Provided: ${smallPill(total)}.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      const variants =
        data.equipmentType === 'Weapon'
          ? await makeRequest('http://localhost:9998/weapons', {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            })
          : await makeRequest('http://localhost:9998/armors', {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            });

      const equipment = await makeRequest('http://localhost:9998/forge/full-build', {
        method: RequestMethod.POST,
        response: ResponseType.JSON,
        body:
          data.equipmentType === 'Weapon'
            ? {
                race: data.race,
                achievement: data.achievement,
                weapon: {
                  world: data.world ?? "Stonewake's Cross",
                  recipe: Object.entries(data.ores ?? {})
                    .map(([name, quantity]) => `${quantity} ${name}`)
                    .join(', '),
                  category: data.category,
                  variant: (data.variant =
                    variants
                      .filter((e: any) => e.type === data.category)
                      .flatMap((e: any) => e.variants)
                      .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
                      .at(0)?.name ?? data.variant),
                  craft_quality_percent: data.quality,
                  enhancement: data.enhancement,
                  runes: data.runes,
                  lethality: data.lethality,
                },
              }
            : {
                race: data.race,
                achievement: data.achievement,
                armor: {
                  world: data.world ?? "Stonewake's Cross",
                  recipe: Object.entries(data.ores ?? {})
                    .map(([name, quantity]) => `${quantity} ${name}`)
                    .join(', '),
                  category: data.category,
                  variant: (data.variant =
                    variants
                      .filter((e: any) => e.type === data.category)
                      .flatMap((e: any) => e.variants)
                      .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
                      .at(0)?.name ?? data.variant),
                  craft_quality_percent: data.quality,
                  enhancement: data.enhancement,
                  runes: data.runes,
                },
              },
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      data.equipmentRuneSlots =
        data.equipmentType === 'Weapon' ? equipment.weapon.rune_slots : equipment.armor.rune_slots;

      selections.set(i.user.id.toString(), data);

      const validVariants = variants
        .filter((equipment: any) => equipment.type === data.category)
        .flatMap((equipment: any) =>
          equipment.variants.map((variant: any) => ({
            ...variant,
            type: equipment.type,
          })),
        )
        .filter(
          (v: any) =>
            v.name.toLowerCase() !==
            (data.equipmentType === 'Weapon'
              ? equipment.weapon.name
              : equipment.armor.name
            ).toLowerCase(),
        )
        .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
        .map((v: any) => ({
          label: v.name,
          value: v.name,
        }));

      await i.deferEdit();
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
                    content: `# ${data.equipmentType === 'Weapon' ? equipment.weapon.name : equipment.armor.name}\n${
                      data.equipmentType === 'Weapon'
                        ? equipment.weapon.traits_rendered?.length
                          ? equipment.weapon.traits_rendered.map((t: any) => `> *${t.source}: ${t.trait}*`).join('\n')
                          : '\n> *None*'
                        : equipment.armor.traits_rendered?.length
                          ? equipment.armor.traits_rendered.map((t: any) => `> *${t.source}: ${t.trait}*`).join('\n')
                          : '\n> *None*'
                    }`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: data.equipmentType === 'Weapon' ? equipment.weapon.image : equipment.armor.image,
                  },
                },
              },
              ...(validVariants.length > 0
                ? [
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'change-variant',
                          placeholder: 'View different variants.',
                          options: validVariants,
                        },
                      ],
                    },
                  ] satisfies MessageComponents
                : []),
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: 'Click the button on the right to view more options.',
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'forge-extra-options',
                  label: 'Extra',
                  style: ButtonStyles.Secondary,
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${data.equipmentType === 'Weapon' ? `- Multiplier: **${equipment.weapon.avg_multi}x**\n- Forged Base Damage: **${equipment.weapon.base_damage_display}**\n- Attack Speed: **${equipment.weapon.final_attack_interval}s**\n- Effective DPS: **${equipment.weapon.dps.effective}**\n- Total Ores: **${equipment.weapon.total_ores}**\n- Sell Price: **${equipment.weapon.sell_price_display}**` : `- Multiplier: **${equipment.armor.avg_multi}x**\n- Defense: **${equipment.armor.defense}**\n- Sell Price: **${equipment.armor.sell_price_display}**`}`,
              },
              ...(data.race || data.quality || data.enhancement || data.achievement || (data.runes ?? []).length
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `## Extras:\n${[
                        data.race && `- Race: **${data.race}**`,
                        data.quality !== undefined && `- Quality: **${data.quality}**`,
                        data.enhancement && `- Enhancement: **+${data.enhancement}**`,
                        data.achievement?.name &&
                          data.achievement.stage &&
                          `- Achievement: **${data.achievement.name} (${data.achievement.stage})**`,
                        (data.runes ?? []).filter((r: any) => r).length &&
                          `- Runes:\n${(data.runes ?? [])
                            .filter((rune: any) => rune)
                            .map((rune: any) => `  - **${rune.rune.replace(/^Rune:\s*/, '')}**`)
                            .join('\n')}`,
                      ]
                        .filter(Boolean)
                        .join('\n')}`,
                    },
                  ] satisfies MessageComponents)
                : []),
              ...((data.equipmentType === 'Weapon' ? equipment.weapon.rune_slots >= 1 : equipment.armor.rune_slots >= 1)
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Click the button on the right to manage runes.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'manage-runes',
                        label: 'Runes',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-forge-chances',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('change-variant', async (i) => {
      if (!i.data) return;

      const selectedVariant = String(i.data.values?.[0]);

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      data.variant = selectedVariant;

      const variants =
        data.equipmentType === 'Weapon'
          ? await makeRequest('http://localhost:9998/weapons', {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            })
          : await makeRequest('http://localhost:9998/armors', {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            });

      const equipment = await makeRequest('http://localhost:9998/forge/full-build', {
        method: RequestMethod.POST,
        response: ResponseType.JSON,
        body:
          data.equipmentType === 'Weapon'
            ? {
                race: data.race,
                achievement: data.achievement,
                weapon: {
                  world: data.world ?? "Stonewake's Cross",
                  recipe: Object.entries(data.ores ?? {})
                    .map(([name, quantity]) => `${quantity} ${name}`)
                    .join(', '),
                  category: data.category,
                  variant: data.variant,
                  craft_quality_percent: data.quality,
                  enhancement: data.enhancement,
                  runes: data.runes,
                  lethality: data.lethality,
                },
              }
            : {
                race: data.race,
                achievement: data.achievement,
                armor: {
                  world: data.world ?? "Stonewake's Cross",
                  recipe: Object.entries(data.ores ?? {})
                    .map(([name, quantity]) => `${quantity} ${name}`)
                    .join(', '),
                  category: data.category,
                  variant: data.variant,
                  craft_quality_percent: data.quality,
                  enhancement: data.enhancement,
                  runes: data.runes,
                },
              },
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      data.equipmentRuneSlots =
        data.equipmentType === 'Weapon' ? equipment.weapon.rune_slots : equipment.armor.rune_slots;

      const validVariants = variants
        .filter((equipment: any) => equipment.type === data.category)
        .flatMap((equipment: any) =>
          equipment.variants.map((variant: any) => ({
            ...variant,
            type: equipment.type,
          })),
        )
        .filter(
          (v: any) =>
            v.name.toLowerCase() !==
            (data.equipmentType === 'Weapon'
              ? equipment.weapon.name
              : equipment.armor.name
            ).toLowerCase(),
        )
        .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
        .map((v: any) => ({
          label: v.name,
          value: v.name,
        }));

      await i.deferEdit();
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
                    content: `# ${data.equipmentType === 'Weapon' ? equipment.weapon.name : equipment.armor.name}\n${
                      data.equipmentType === 'Weapon'
                        ? equipment.weapon.traits_rendered?.length
                          ? equipment.weapon.traits_rendered.map((t: any) => `> *${t.source}: ${t.trait}*`).join('\n')
                          : '\n> *None*'
                        : equipment.armor.traits_rendered?.length
                          ? equipment.armor.traits_rendered.map((t: any) => `> *${t.source}: ${t.trait}*`).join('\n')
                          : '\n> *None*'
                    }`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: data.equipmentType === 'Weapon' ? equipment.weapon.image : equipment.armor.image,
                  },
                },
              },
              ...(validVariants.length > 0
                ? [
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'change-variant',
                          placeholder: 'View different variants.',
                          options: validVariants,
                        },
                      ],
                    },
                  ] satisfies MessageComponents
                : []),
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: 'Click the button on the right to view more options.',
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'forge-extra-options',
                  label: 'Extra',
                  style: ButtonStyles.Secondary,
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${data.equipmentType === 'Weapon' ? `- Multiplier: **${equipment.weapon.avg_multi}x**\n- Forged Base Damage: **${equipment.weapon.base_damage_display}**\n- Attack Speed: **${equipment.weapon.final_attack_interval}s**\n- Effective DPS: **${equipment.weapon.dps.effective}**\n- Total Ores: **${equipment.weapon.total_ores}**\n- Sell Price: **${equipment.weapon.sell_price_display}**` : `- Multiplier: **${equipment.armor.avg_multi}x**\n- Defense: **${equipment.armor.defense}**\n- Sell Price: **${equipment.armor.sell_price_display}**`}`,
              },
              ...(data.race || data.quality || data.enhancement || data.achievement || (data.runes ?? []).length
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `## Extras:\n${[
                        data.race && `- Race: **${data.race}**`,
                        data.quality !== undefined && `- Quality: **${data.quality}**`,
                        data.enhancement && `- Enhancement: **+${data.enhancement}**`,
                        data.achievement?.name &&
                          data.achievement.stage &&
                          `- Achievement: **${data.achievement.name} (${data.achievement.stage})**`,
                        (data.runes ?? []).filter((r: any) => r).length &&
                          `- Runes:\n${(data.runes ?? [])
                            .filter((rune: any) => rune)
                            .map((rune: any) => `  - **${rune.rune.replace(/^Rune:\s*/, '')}**`)
                            .join('\n')}`,
                      ]
                        .filter(Boolean)
                        .join('\n')}`,
                    },
                  ] satisfies MessageComponents)
                : []),
              ...((data.equipmentType === 'Weapon' ? equipment.weapon.rune_slots >= 1 : equipment.armor.rune_slots >= 1)
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Click the button on the right to manage runes.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'manage-runes',
                        label: 'Runes',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-forge-chances',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('forge-extra-options', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      await i.respond({
        customId: 'result-extra-options',
        title: 'Extra Options',
        components: [
          {
            type: MessageComponentTypes.Label,
            label: 'Type the forge quality.',
            component: {
              type: MessageComponentTypes.TextInput,
              customId: 'forge-quality',
              placeholder: 'Use numbers from 0 to 100.',
              style: TextStyles.Short,
              required: false,
            },
          },
          {
            type: MessageComponentTypes.Label,
            label: 'Type the enhancement level.',
            component: {
              type: MessageComponentTypes.TextInput,
              customId: 'forge-enhancement',
              placeholder: 'Use numbers from 0 to 9.',
              style: TextStyles.Short,
              required: false,
            },
          },
        ],
      });
    });
    handlers.set('result-extra-options', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const selectedQuality =
        typeof i.data.components?.[0]?.component?.value === 'string' &&
        !Number.isNaN(Number(i.data.components?.[0]?.component?.value))
          ? Number(i.data.components?.[0]?.component?.value)
          : undefined;

      const selectedEnhancement =
        typeof i.data.components?.[1]?.component?.value === 'string' &&
        !Number.isNaN(Number(i.data.components?.[1]?.component?.value))
          ? Number(i.data.components?.[1]?.component?.value)
          : undefined;

      if (!selectedQuality && !selectedEnhancement) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} Please provide a ${smallPill('quality')} or ${smallPill('enhancement')} level.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (
        selectedQuality !== undefined &&
        (!Number.isInteger(selectedQuality) || selectedQuality < 0 || selectedQuality > 100)
      ) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} Please select a forging quality from 0 to 100.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (
        selectedEnhancement !== undefined &&
        (!Number.isInteger(selectedEnhancement) || selectedEnhancement < 0 || selectedEnhancement > 9)
      ) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} Please select an enhancement level from 0 to 9.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      data.quality = selectedQuality;
      data.enhancement = selectedEnhancement;

      const variants =
        data.equipmentType === 'Weapon'
          ? await makeRequest('http://localhost:9998/weapons', {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            })
          : await makeRequest('http://localhost:9998/armors', {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            });

      const equipment = await makeRequest('http://localhost:9998/forge/full-build', {
        method: RequestMethod.POST,
        response: ResponseType.JSON,
        body:
          data.equipmentType === 'Weapon'
            ? {
                race: data.race,
                achievement: data.achievement,
                weapon: {
                  world: data.world ?? "Stonewake's Cross",
                  recipe: Object.entries(data.ores ?? {})
                    .map(([name, quantity]) => `${quantity} ${name}`)
                    .join(', '),
                  category: data.category,
                  variant: (data.variant =
                    variants
                      .filter((e: any) => e.type === data.category)
                      .flatMap((e: any) => e.variants)
                      .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
                      .at(0)?.name ?? data.variant),
                  craft_quality_percent: data.quality,
                  enhancement: data.enhancement,
                  runes: data.runes,
                  lethality: data.lethality,
                },
              }
            : {
                race: data.race,
                achievement: data.achievement,
                armor: {
                  world: data.world ?? "Stonewake's Cross",
                  recipe: Object.entries(data.ores ?? {})
                    .map(([name, quantity]) => `${quantity} ${name}`)
                    .join(', '),
                  category: data.category,
                  variant: (data.variant =
                    variants
                      .filter((e: any) => e.type === data.category)
                      .flatMap((e: any) => e.variants)
                      .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
                      .at(0)?.name ?? data.variant),
                  craft_quality_percent: data.quality,
                  enhancement: data.enhancement,
                  runes: data.runes,
                },
              },
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      data.equipmentRuneSlots =
        data.equipmentType === 'Weapon' ? equipment.weapon.rune_slots : equipment.armor.rune_slots;

      const validVariants = variants
        .filter((equipment: any) => equipment.type === data.category)
        .flatMap((equipment: any) =>
          equipment.variants.map((variant: any) => ({
            ...variant,
            type: equipment.type,
          })),
        )
        .filter(
          (v: any) =>
            v.name.toLowerCase() !==
            (data.equipmentType === 'Weapon'
              ? equipment.weapon.name
              : equipment.armor.name
            ).toLowerCase(),
        )
        .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
        .map((v: any) => ({
          label: v.name,
          value: v.name,
        }));

      await i.deferEdit();
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
                    content: `# ${data.equipmentType === 'Weapon' ? equipment.weapon.name : equipment.armor.name}\n${
                      data.equipmentType === 'Weapon'
                        ? equipment.weapon.traits_rendered?.length
                          ? equipment.weapon.traits_rendered.map((t: any) => `> *${t.source}: ${t.trait}*`).join('\n')
                          : '\n> *None*'
                        : equipment.armor.traits_rendered?.length
                          ? equipment.armor.traits_rendered.map((t: any) => `> *${t.source}: ${t.trait}*`).join('\n')
                          : '\n> *None*'
                    }`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: data.equipmentType === 'Weapon' ? equipment.weapon.image : equipment.armor.image,
                  },
                },
              },
              ...(validVariants.length > 0
                ? [
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'change-variant',
                          placeholder: 'View different variants.',
                          options: validVariants,
                        },
                      ],
                    },
                  ] satisfies MessageComponents
                : []),
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: 'Click the button on the right to view more options.',
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'forge-extra-options',
                  label: 'Extra',
                  style: ButtonStyles.Secondary,
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${data.equipmentType === 'Weapon' ? `- Multiplier: **${equipment.weapon.avg_multi}x**\n- Forged Base Damage: **${equipment.weapon.base_damage_display}**\n- Attack Speed: **${equipment.weapon.final_attack_interval}s**\n- Effective DPS: **${equipment.weapon.dps.effective}**\n- Total Ores: **${equipment.weapon.total_ores}**\n- Sell Price: **${equipment.weapon.sell_price_display}**` : `- Multiplier: **${equipment.armor.avg_multi}x**\n- Defense: **${equipment.armor.defense}**\n- Sell Price: **${equipment.armor.sell_price_display}**`}`,
              },
              ...(data.race || data.quality || data.enhancement || data.achievement || (data.runes ?? []).length
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `## Extras:\n${[
                        data.race && `- Race: **${data.race}**`,
                        data.quality !== undefined && `- Quality: **${data.quality}**`,
                        data.enhancement && `- Enhancement: **+${data.enhancement}**`,
                        data.achievement?.name &&
                          data.achievement.stage &&
                          `- Achievement: **${data.achievement.name} (${data.achievement.stage})**`,
                        (data.runes ?? []).filter((r: any) => r).length &&
                          `- Runes:\n${(data.runes ?? [])
                            .filter((rune: any) => rune)
                            .map((rune: any) => `  - **${rune.rune.replace(/^Rune:\s*/, '')}**`)
                            .join('\n')}`,
                      ]
                        .filter(Boolean)
                        .join('\n')}`,
                    },
                  ] satisfies MessageComponents)
                : []),
              ...((data.equipmentType === 'Weapon' ? equipment.weapon.rune_slots >= 1 : equipment.armor.rune_slots >= 1)
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Click the button on the right to manage runes.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'manage-runes',
                        label: 'Runes',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-forge-chances',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    // Rune bullshit starts here
    handlers.set('manage-runes', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const runes = await makeRequest('http://localhost:9998/runes', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Rune Management\nManage the runes for your equipment here.',
              },
              {
                type: MessageComponentTypes.Separator,
              },
              ...((data.runes?.length ?? 0) > 0
                ? ([
                    ...(data.runes ?? []).flatMap(
                      (rune: any) =>
                        [
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `## ${rune.rune.replace(/^Rune:\s*/, '')}\n${
                              rune.roll && Object.keys(rune.roll).length > 0
                                ? Object.entries(rune.roll)
                                    .map(([key, value]) => {
                                      const runeNamePrefix = rune.rune
                                        .replace(/^Rune:\s*/, '')
                                        .toLowerCase()
                                        .replace(/\s+/g, '_');
                                      const cleanKey = key.startsWith(runeNamePrefix + '_')
                                        ? key.slice(runeNamePrefix.length + 1)
                                        : key;
                                      return `- ${
                                        cleanKey
                                          .replace(/_/g, ' ')
                                          .split(' ')
                                          .filter(
                                            (w) =>
                                              w &&
                                              !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                w.toLowerCase(),
                                              ),
                                          )
                                          .map((w) => {
                                            const lower = w.toLowerCase();
                                            switch (lower) {
                                              case 'ii':
                                                return 'II';
                                              case 'iii':
                                                return 'III';
                                              case 'iv':
                                                return 'IV';
                                              case 'v':
                                                return 'V';
                                              case 'ix':
                                                return 'IX';
                                              case 'x':
                                                return 'X';
                                              default:
                                                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                            }
                                          })
                                          .join(' ') || rune.rune.replace(/^Rune:\s*/, '')
                                      }: **${
                                        /chance|percent/i.test(cleanKey)
                                          ? `${value}%`
                                          : /duration|cooldown/i.test(cleanKey)
                                            ? `${value}s`
                                            : value
                                      }**`;
                                    })
                                    .join('\n')
                                : '- No values configured'
                            }${
                              rune.subtraits && rune.subtraits.length > 0
                                ? '\n\n**Subtraits:**\n' +
                                  rune.subtraits
                                    .map((subtrait: any) =>
                                      Object.entries(subtrait.roll || {})
                                        .map(([key, value]) => {
                                          const subraidNamePrefix = (subtrait.subtrait ?? '')
                                            .replace(/^Secondary:\s*/, '')
                                            .toLowerCase()
                                            .replace(/\s+/g, '_');
                                          const cleanKey = key.startsWith(subraidNamePrefix + '_')
                                            ? key.slice(subraidNamePrefix.length + 1)
                                            : key;
                                          return `- ${
                                            cleanKey
                                              .replace(/_/g, ' ')
                                              .split(' ')
                                              .filter(
                                                (w) =>
                                                  w &&
                                                  !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                    w.toLowerCase(),
                                                  ),
                                              )
                                              .map((w) => {
                                                const lower = w.toLowerCase();
                                                switch (lower) {
                                                  case 'ii':
                                                    return 'II';
                                                  case 'iii':
                                                    return 'III';
                                                  case 'iv':
                                                    return 'IV';
                                                  case 'v':
                                                    return 'V';
                                                  case 'ix':
                                                    return 'IX';
                                                  case 'x':
                                                    return 'X';
                                                  default:
                                                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                                }
                                              })
                                              .join(' ') || (subtrait.subtrait ?? '').replace(/^Secondary:\s*/, '')
                                          }: **${
                                            /chance|percent/i.test(cleanKey)
                                              ? `${value}%`
                                              : /duration|cooldown/i.test(cleanKey)
                                                ? `${value}s`
                                                : value
                                          }**`;
                                        })
                                        .join('\n'),
                                    )
                                    .join('\n')
                                : ''
                            }`,
                          },
                          {
                            type: MessageComponentTypes.Separator,
                          },
                        ] satisfies MessageComponents,
                    ),
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'manage-rune',
                          placeholder: 'Select a rune to manage.',
                          options: (data.runes ?? []).map((rune: any, index: number) => ({
                            label: rune.rune?.replace('Rune: ', '') || `Rune ${index + 1}`,
                            value: String(rune.id),
                          })),
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              ...(((data.runes ?? []).length ?? 0) < (data.equipmentRuneSlots ?? 0)
                ? ([
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'select-rune',
                          placeholder: 'Available Runes:',
                          options: runes
                            .filter((rune: any) => rune.type === data.equipmentType)
                            .map((rune: any) => ({
                              label: rune.name,
                              value: rune.name,
                              description: rune.rarity,
                            })),
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-forge-results',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('select-rune', async (i) => {
      if (!i.data) return;

      const selectedRune = String(i.data.values?.[0]);

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      data.runeTemp = { name: selectedRune, id: randomUUID() };

      const rune = await makeRequest('http://localhost:9998/runes', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        params: {
          name: data.runeTemp?.name,
        },
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      // Dynamically extract trait range fields from the trait objects
      const getRangeFields = (trait: any): string[] => {
        return Object.keys(trait).filter(
          (key: string) =>
            typeof trait[key] === 'object' && trait[key] !== null && 'min' in trait[key] && 'max' in trait[key],
        );
      };

      data.runeTemp.fieldMapping = {
        ...Object.fromEntries(
          rune.primary_traits?.flatMap((trait: any) => {
            const rangeFields = getRangeFields(trait);
            //ucv forthe iv9
            return rangeFields
              .map((field) => {
                const canonicalKey = trait?.keys?.[field];
                if (!canonicalKey) return null;
                return [`rune-${trait.name}-${field}`, canonicalKey];
              })
              .filter(Boolean) as [string, string][];
          }) || [],
        ),
        ...(rune.proc
          ? Object.fromEntries(
              ['chance_range', 'cooldown_range']
                .filter((field) => rune.proc[field] && rune.proc?.keys?.[field])
                .map((field) => [`rune-proc-${field}`, rune.proc.keys[field]]),
            )
          : {}),
      };

      data.runeTemp.ranges = {
        ...Object.fromEntries(
          rune.primary_traits?.flatMap((trait: any) => {
            const rangeFields = getRangeFields(trait);
            return rangeFields.map((field) => [`rune-${trait.name}-${field}`, trait[field]]);
          }) || [],
        ),
        ...(rune.proc
          ? Object.fromEntries(
              ['chance_range', 'cooldown_range']
                .filter((field) => rune.proc[field])
                .map((field) => [`rune-proc-${field}`, rune.proc[field]]),
            )
          : {}),
      };

      selections.set(i.user.id.toString(), data);

      const hasTraitComponents = rune.primary_traits?.some((trait: any) =>
        Object.keys(trait).some(
          (key: string) =>
            typeof trait[key] === 'object' && trait[key] !== null && 'min' in trait[key] && 'max' in trait[key],
        ),
      );

      const hasProcComponents = rune.proc && ['chance_range', 'cooldown_range'].some((field) => rune.proc[field]);

      if (!hasTraitComponents && !hasProcComponents) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${pill(selectedRune)} has no configurable ranges.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      await i.respond({
        customId: 'configure-rune-values',
        title: `Configure ${selectedRune}`,
        components: [
          ...(rune.primary_traits?.flatMap((trait: any) => {
            const rangeFields = getRangeFields(trait);
            return rangeFields.map((field) => ({
              type: MessageComponentTypes.Label,
              label: `Type the value of the ${(
                trait.name.replace(/_/g, ' ') +
                ' ' +
                field.replace(/_(?:per_second|weapon|fraction|range|percent)(?=_|$)|_/g, (m) => (m === '_' ? ' ' : ''))
              ).trim()}.`,
              component: {
                type: MessageComponentTypes.TextInput,
                customId: `rune-${trait.name}-${field}`,
                placeholder: `Use numbers from ${trait[field].min} to ${trait[field].max}.`,
                style: TextStyles.Short,
                required: true,
              },
            }));
          }) || []),
          ...(rune.proc
            ? ['chance_range', 'cooldown_range']
                .filter((field) => rune.proc[field])
                .map((field) => ({
                  type: MessageComponentTypes.Label,
                  label: `Type the value of the proc ${field.replace(/_range$/, '').replace(/_/g, ' ')}.`,
                  component: {
                    type: MessageComponentTypes.TextInput,
                    customId: `rune-proc-${field}`,
                    placeholder: `Use numbers from ${rune.proc[field].min} to ${rune.proc[field].max}.`,
                    style: TextStyles.Short,
                    required: true,
                  },
                }))
            : []),
        ],
      });
    });
    handlers.set('configure-rune-values', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const runeValues: Record<string, number> = {};
      const fieldMapping = data.runeTemp?.fieldMapping || {};
      const runeRanges = data.runeTemp?.ranges || {};
      const invalidFields: string[] = [];
      const outOfRangeFields: { field: string; value: number; min: number; max: number }[] = [];

      i.data.components?.forEach((comp: any) => {
        if (comp.component?.customId && comp.component?.value !== undefined && comp.component?.value !== '') {
          const parsedValue = Number.parseFloat(comp.component?.value);
          const customId = comp.component?.customId;
          const range = runeRanges[customId];

          if (Number.isNaN(parsedValue)) {
            invalidFields.push(customId);
          } else if (
            (range?.min != null && parsedValue < range.min) ||
            (range?.max != null && parsedValue > range.max)
          ) {
            outOfRangeFields.push({
              field: customId,
              value: parsedValue,
              min: range.min,
              max: range.max,
            });
          } else {
            const mappedFieldName = fieldMapping[customId] || customId;
            runeValues[mappedFieldName] = parsedValue;
          }
        }
      });

      if (invalidFields.length > 0) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} Invalid number format for: ${pill(invalidFields.join(', '))}. Please provide valid numbers.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      if (outOfRangeFields.length > 0) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} Some values are out of range:\n${outOfRangeFields.map((f) => `${pill(f.field)}: ${smallPill(f.value)} is not between ${smallPill(f.min)} and ${smallPill(f.max)}`).join('\n')}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      const runeIndex = (data.runes ?? []).findIndex((r: any) => r.id === data.runeTemp?.id);
      if (runeIndex >= 0) {
        const rune = (data.runes ?? [])[runeIndex];
        if (rune) rune.roll = runeValues;
      } else {
        (data.runes ??= []).push({
          id: randomUUID(),
          rune: `Rune: ${data.runeTemp?.name}`,
          roll: runeValues,
        });
      }

      selections.set(i.user.id.toString(), data);

      await i.respond({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon(Emoji.Correct)} ${pill(data.runeTemp?.name)} has been configured and added to your runes.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      const runes = await makeRequest('http://localhost:9998/runes', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
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
                type: MessageComponentTypes.TextDisplay,
                content: '# Rune Management\nManage the runes for your equipment here.',
              },
              {
                type: MessageComponentTypes.Separator,
              },
              ...((data.runes?.length ?? 0) > 0
                ? ([
                    ...(data.runes ?? []).flatMap(
                      (rune: any) =>
                        [
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `## ${rune.rune.replace(/^Rune:\s*/, '')}\n${
                              rune.roll && Object.keys(rune.roll).length > 0
                                ? Object.entries(rune.roll)
                                    .map(([key, value]) => {
                                      const runeNamePrefix = rune.rune
                                        .replace(/^Rune:\s*/, '')
                                        .toLowerCase()
                                        .replace(/\s+/g, '_');
                                      const cleanKey = key.startsWith(runeNamePrefix + '_')
                                        ? key.slice(runeNamePrefix.length + 1)
                                        : key;
                                      return `- ${
                                        cleanKey
                                          .replace(/_/g, ' ')
                                          .split(' ')
                                          .filter(
                                            (w) =>
                                              w &&
                                              !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                w.toLowerCase(),
                                              ),
                                          )
                                          .map((w) => {
                                            const lower = w.toLowerCase();
                                            switch (lower) {
                                              case 'ii':
                                                return 'II';
                                              case 'iii':
                                                return 'III';
                                              case 'iv':
                                                return 'IV';
                                              case 'v':
                                                return 'V';
                                              case 'ix':
                                                return 'IX';
                                              case 'x':
                                                return 'X';
                                              default:
                                                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                            }
                                          })
                                          .join(' ') || rune.rune.replace(/^Rune:\s*/, '')
                                      }: **${
                                        /chance|percent/i.test(cleanKey)
                                          ? `${value}%`
                                          : /duration|cooldown/i.test(cleanKey)
                                            ? `${value}s`
                                            : value
                                      }**`;
                                    })
                                    .join('\n')
                                : '- No values configured'
                            }${
                              rune.subtraits && rune.subtraits.length > 0
                                ? '\n\n**Subtraits:**\n' +
                                  rune.subtraits
                                    .map((subtrait: any) =>
                                      Object.entries(subtrait.roll || {})
                                        .map(([key, value]) => {
                                          const subraidNamePrefix = (subtrait.subtrait ?? '')
                                            .replace(/^Secondary:\s*/, '')
                                            .toLowerCase()
                                            .replace(/\s+/g, '_');
                                          const cleanKey = key.startsWith(subraidNamePrefix + '_')
                                            ? key.slice(subraidNamePrefix.length + 1)
                                            : key;
                                          return `- ${
                                            cleanKey
                                              .replace(/_/g, ' ')
                                              .split(' ')
                                              .filter(
                                                (w) =>
                                                  w &&
                                                  !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                    w.toLowerCase(),
                                                  ),
                                              )
                                              .map((w) => {
                                                const lower = w.toLowerCase();
                                                switch (lower) {
                                                  case 'ii':
                                                    return 'II';
                                                  case 'iii':
                                                    return 'III';
                                                  case 'iv':
                                                    return 'IV';
                                                  case 'v':
                                                    return 'V';
                                                  case 'ix':
                                                    return 'IX';
                                                  case 'x':
                                                    return 'X';
                                                  default:
                                                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                                }
                                              })
                                              .join(' ') || (subtrait.subtrait ?? '').replace(/^Secondary:\s*/, '')
                                          }: **${
                                            /chance|percent/i.test(cleanKey)
                                              ? `${value}%`
                                              : /duration|cooldown/i.test(cleanKey)
                                                ? `${value}s`
                                                : value
                                          }**`;
                                        })
                                        .join('\n'),
                                    )
                                    .join('\n')
                                : ''
                            }`,
                          },
                          {
                            type: MessageComponentTypes.Separator,
                          },
                        ] satisfies MessageComponents,
                    ),
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'manage-rune',
                          placeholder: 'Select a rune to manage.',
                          options: (data.runes ?? []).map((rune: any, index: number) => ({
                            label: rune.rune?.replace('Rune: ', '') || `Rune ${index + 1}`,
                            value: String(rune.id),
                          })),
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              ...(((data.runes ?? []).length ?? 0) < (data.equipmentRuneSlots ?? 0)
                ? ([
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'select-rune',
                          placeholder: 'Available Runes:',
                          options: runes
                            .filter((rune: any) => rune.type === data.equipmentType)
                            .map((rune: any) => ({
                              label: rune.name,
                              value: rune.name,
                              description: rune.rarity,
                            })),
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-forge-results',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('manage-rune', async (i) => {
      if (!i.data) return;

      const selectedRuneId = String(i.data.values?.[0]);

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      data.runeTemp = { id: selectedRuneId };
      const selectedRuneObj = (data.runes ?? []).find((r: any) => r.id === selectedRuneId);
      if (!selectedRuneObj) return;
      data.runeTemp.name = selectedRuneObj?.rune?.replace('Rune: ', '');

      const rune = await makeRequest('http://localhost:9998/runes', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        params: {
          name: data.runeTemp?.name,
        },
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      await i.deferEdit();
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
                    content: `# ${rune.name}`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: rune.image,
                  },
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `## Trait`,
              },
              ...(selectedRuneObj
                ? [
                    ...[selectedRuneObj].flatMap(
                      (rune: any) =>
                        [
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `${
                              rune.roll && Object.keys(rune.roll).length > 0
                                ? Object.entries(rune.roll)
                                    .map(([key, value]) => {
                                      const runeNamePrefix = rune.rune
                                        .replace(/^Rune:\s*/, '')
                                        .toLowerCase()
                                        .replace(/\s+/g, '_');
                                      const cleanKey = key.startsWith(runeNamePrefix + '_')
                                        ? key.slice(runeNamePrefix.length + 1)
                                        : key;
                                      return `- ${
                                        cleanKey
                                          .replace(/_/g, ' ')
                                          .split(' ')
                                          .filter(
                                            (w) =>
                                              w &&
                                              !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                w.toLowerCase(),
                                              ),
                                          )
                                          .map((w) => {
                                            const lower = w.toLowerCase();
                                            switch (lower) {
                                              case 'ii':
                                                return 'II';
                                              case 'iii':
                                                return 'III';
                                              case 'iv':
                                                return 'IV';
                                              case 'v':
                                                return 'V';
                                              case 'ix':
                                                return 'IX';
                                              case 'x':
                                                return 'X';
                                              default:
                                                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                            }
                                          })
                                          .join(' ') || rune.rune.replace(/^Rune:\s*/, '')
                                      }: **${
                                        /chance|percent/i.test(cleanKey)
                                          ? `${value}%`
                                          : /duration|cooldown/i.test(cleanKey)
                                            ? `${value}s`
                                            : value
                                      }**`;
                                    })
                                    .join('\n')
                                : '- No values configured'
                            }`,
                          },
                          ...(rune.subtraits && rune.subtraits.length > 0
                            ? ([
                                {
                                  type: MessageComponentTypes.TextDisplay,
                                  content: `## Subtraits\n${rune.subtraits
                                    .map((subtrait: any) =>
                                      Object.entries(subtrait.roll || {})
                                        .map(([key, value]) => {
                                          const subraidNamePrefix = (subtrait.subtrait ?? subtrait.rune ?? '')
                                            .replace(/^Secondary:\s*/, '')
                                            .toLowerCase()
                                            .replace(/\s+/g, '_');
                                          const cleanKey = key.startsWith(subraidNamePrefix + '_')
                                            ? key.slice(subraidNamePrefix.length + 1)
                                            : key;
                                          return `- ${
                                            cleanKey
                                              .replace(/_/g, ' ')
                                              .split(' ')
                                              .filter(
                                                (w) =>
                                                  w &&
                                                  !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                    w.toLowerCase(),
                                                  ),
                                              )
                                              .map((w) => {
                                                const lower = w.toLowerCase();
                                                switch (lower) {
                                                  case 'ii':
                                                    return 'II';
                                                  case 'iii':
                                                    return 'III';
                                                  case 'iv':
                                                    return 'IV';
                                                  case 'v':
                                                    return 'V';
                                                  case 'ix':
                                                    return 'IX';
                                                  case 'x':
                                                    return 'X';
                                                  default:
                                                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                                }
                                              })
                                              .join(' ') ||
                                            (subtrait.subtrait ?? subtrait.rune ?? '').replace(/^Secondary:\s*/, '')
                                          }: **${
                                            /chance|percent/i.test(cleanKey)
                                              ? `${value}%`
                                              : /duration|cooldown/i.test(cleanKey)
                                                ? `${value}s`
                                                : value
                                          }**`;
                                        })
                                        .join('\n'),
                                    )
                                    .join('\n')}`,
                                },
                              ] satisfies MessageComponents)
                            : []),
                        ] satisfies MessageComponents,
                    ),
                  ]
                : []),
              ...(((data.runes ?? []).find((r: any) => r.id === data.runeTemp?.id)?.subtraits?.length ?? 0) <
              (rune.max_subtraits ?? (rune.is_tier2_available ? 2 : 1))
                ? ([
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Press the button on the right to add a subtrait.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'add-subtrait',
                        label: 'Add Subtrait',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-rune-results',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'remove-rune',
                    label: 'Remove',
                    style: ButtonStyles.Danger,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('add-subtrait', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const rune = await makeRequest('http://localhost:9998/runes', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        params: {
          name: data.runeTemp?.name,
        },
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      const runeIndex = (data.runes ?? []).findIndex((r: any) => r.id === data.runeTemp?.id);
      const selectedRune = runeIndex !== undefined && runeIndex >= 0 ? (data.runes ?? [])[runeIndex] : undefined;
      const addedSubtraits =
        selectedRune?.subtraits?.map((s: any) => (s.subtrait ?? s.rune ?? '').replace(/^Secondary:\s*/, '')) || [];

      await i.respond({
        customId: 'subtrait-management',
        title: 'Subtrait Management',
        components: [
          {
            type: MessageComponentTypes.Label,
            label: 'Select a subtrait to add to your rune.',
            component: {
              type: MessageComponentTypes.StringSelect,
              customId: 'subtrait-selection',
              options: Object.keys(rune.subtraits)
                .filter((subtraitName) => !addedSubtraits.includes(subtraitName))
                .map((subtraitName) => ({
                  label: subtraitName,
                  value: subtraitName,
                })),
              required: true,
            },
          },
          {
            type: MessageComponentTypes.Label,
            label: 'Type the value of the subtrait.',
            component: {
              type: MessageComponentTypes.TextInput,
              customId: 'subtrait-value',
              placeholder: 'Only numbers are allowed.',
              style: TextStyles.Short,
              required: true,
            },
          },
        ],
      });
    });
    handlers.set('subtrait-management', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const selectedSubtrait =
        typeof i.data.components?.[0]?.component?.values?.[0] === 'string'
          ? i.data.components?.[0]?.component?.values?.[0]
          : undefined;

      const selectedSubtraitValue =
        typeof i.data.components?.[1]?.component?.value === 'string'
          ? Number(i.data.components?.[1]?.component?.value)
          : undefined;

      if (!selectedSubtrait && !selectedSubtraitValue) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} Please select a ${smallPill('subtrait')} and provide a valid value.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      const rune = await makeRequest('http://localhost:9998/runes', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        params: {
          name: data.runeTemp?.name,
        },
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      const subtraitRange = rune.subtraits[selectedSubtrait ?? ''];
      if (
        !subtraitRange ||
        (selectedSubtraitValue !== undefined &&
          (Number.isNaN(selectedSubtraitValue) ||
            selectedSubtraitValue < subtraitRange.min ||
            selectedSubtraitValue > subtraitRange.max))
      ) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} The subtrait value must be between ${smallPill(subtraitRange.min)} and ${smallPill(subtraitRange.max)}.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (selectedSubtraitValue === undefined) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Wrong)} Invalid value provided.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      const runeIndex = (data.runes ?? []).findIndex((r: any) => r.id === data.runeTemp?.id);
      const selectedRune = runeIndex !== undefined && runeIndex >= 0 ? (data.runes ?? [])[runeIndex] : undefined;
      const addedSubtraits =
        selectedRune?.subtraits?.map((s: any) => (s.subtrait ?? s.rune ?? '').replace(/^Secondary:\s*/, '')) || [];
      const maxSubtraits = rune.max_subtraits ?? (rune.is_tier2_available ? 2 : 1);

      if (addedSubtraits.length >= maxSubtraits) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon(Emoji.Exclamation)} This rune can only contain ${smallPill(maxSubtraits)} subtrait(s).`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      if (runeIndex !== undefined && runeIndex >= 0) {
        const selectedRuneEntry = (data.runes ?? [])[runeIndex];
        if (selectedRuneEntry) {
          if (!selectedRuneEntry.subtraits) {
            selectedRuneEntry.subtraits = [];
          }

          // Get the actual key from the rune.subtraits which now includes the key
          const subtraitData = rune.subtraits[selectedSubtrait ?? ''];
          const subtraitKey = subtraitData?.key || (selectedSubtrait ?? '').toLowerCase().replace(/\s+/g, '_');

          selectedRuneEntry.subtraits.push({
            subtrait: `Secondary: ${selectedSubtrait}`,
            roll: {
              [subtraitKey]: selectedSubtraitValue,
            },
          });
        }
      }

      await i.respond({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon(Emoji.Correct)} ${pill(selectedSubtrait)} with value ${smallPill(selectedSubtraitValue)} has been added to your rune.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
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
                    content: `# ${rune.name}`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: rune.image,
                  },
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `## Trait`,
              },
              ...((data.runes?.length ?? 0) > 0
                ? [
                    ...(data.runes ?? []).flatMap(
                      (rune: any) =>
                        [
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `${
                              rune.roll && Object.keys(rune.roll).length > 0
                                ? Object.entries(rune.roll)
                                    .map(([key, value]) => {
                                      const runeNamePrefix = rune.rune
                                        .replace(/^Rune:\s*/, '')
                                        .toLowerCase()
                                        .replace(/\s+/g, '_');
                                      const cleanKey = key.startsWith(runeNamePrefix + '_')
                                        ? key.slice(runeNamePrefix.length + 1)
                                        : key;
                                      return `- ${
                                        cleanKey
                                          .replace(/_/g, ' ')
                                          .split(' ')
                                          .filter(
                                            (w) =>
                                              w &&
                                              !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                w.toLowerCase(),
                                              ),
                                          )
                                          .map((w) => {
                                            const lower = w.toLowerCase();
                                            switch (lower) {
                                              case 'ii':
                                                return 'II';
                                              case 'iii':
                                                return 'III';
                                              case 'iv':
                                                return 'IV';
                                              case 'v':
                                                return 'V';
                                              case 'ix':
                                                return 'IX';
                                              case 'x':
                                                return 'X';
                                              default:
                                                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                            }
                                          })
                                          .join(' ') || rune.rune.replace(/^Rune:\s*/, '')
                                      }: **${
                                        /chance|percent/i.test(cleanKey)
                                          ? `${value}%`
                                          : /duration|cooldown/i.test(cleanKey)
                                            ? `${value}s`
                                            : value
                                      }**`;
                                    })
                                    .join('\n')
                                : '- No values configured'
                            }`,
                          },
                          ...(rune.subtraits && rune.subtraits.length > 0
                            ? ([
                                {
                                  type: MessageComponentTypes.TextDisplay,
                                  content: `## Subtraits\n${rune.subtraits
                                    .map((subtrait: any) =>
                                      Object.entries(subtrait.roll || {})
                                        .map(([key, value]) => {
                                          const subraidNamePrefix = (subtrait.subtrait ?? subtrait.rune ?? '')
                                            .replace(/^Secondary:\s*/, '')
                                            .toLowerCase()
                                            .replace(/\s+/g, '_');
                                          const cleanKey = key.startsWith(subraidNamePrefix + '_')
                                            ? key.slice(subraidNamePrefix.length + 1)
                                            : key;
                                          return `- ${
                                            cleanKey
                                              .replace(/_/g, ' ')
                                              .split(' ')
                                              .filter(
                                                (w) =>
                                                  w &&
                                                  !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                    w.toLowerCase(),
                                                  ),
                                              )
                                              .map((w) => {
                                                const lower = w.toLowerCase();
                                                switch (lower) {
                                                  case 'ii':
                                                    return 'II';
                                                  case 'iii':
                                                    return 'III';
                                                  case 'iv':
                                                    return 'IV';
                                                  case 'v':
                                                    return 'V';
                                                  case 'ix':
                                                    return 'IX';
                                                  case 'x':
                                                    return 'X';
                                                  default:
                                                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                                }
                                              })
                                              .join(' ') ||
                                            (subtrait.subtrait ?? subtrait.rune ?? '').replace(/^Secondary:\s*/, '')
                                          }: **${
                                            /chance|percent/i.test(cleanKey)
                                              ? `${value}%`
                                              : /duration|cooldown/i.test(cleanKey)
                                                ? `${value}s`
                                                : value
                                          }**`;
                                        })
                                        .join('\n'),
                                    )
                                    .join('\n')}`,
                                },
                              ] satisfies MessageComponents)
                            : []),
                        ] satisfies MessageComponents,
                    ),
                  ]
                : []),
              ...(((data.runes ?? []).find((r: any) => r.id === data.runeTemp?.id)?.subtraits?.length ?? 0) <
              (rune.max_subtraits ?? (rune.is_tier2_available ? 2 : 1))
                ? ([
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Press the button on the right to add a subtrait.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'add-subtrait',
                        label: 'Add Subtrait',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-rune-results',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'remove-rune',
                    label: 'Remove',
                    style: ButtonStyles.Danger,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('view-rune-results', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const runes = await makeRequest('http://localhost:9998/runes', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Rune Management\nManage the runes for your equipment here.',
              },
              {
                type: MessageComponentTypes.Separator,
              },
              ...((data.runes?.length ?? 0) > 0
                ? ([
                    ...(data.runes ?? []).flatMap(
                      (rune: any) =>
                        [
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `## ${rune.rune.replace(/^Rune:\s*/, '')}\n${
                              rune.roll && Object.keys(rune.roll).length > 0
                                ? Object.entries(rune.roll)
                                    .map(([key, value]) => {
                                      const runeNamePrefix = rune.rune
                                        .replace(/^Rune:\s*/, '')
                                        .toLowerCase()
                                        .replace(/\s+/g, '_');
                                      const cleanKey = key.startsWith(runeNamePrefix + '_')
                                        ? key.slice(runeNamePrefix.length + 1)
                                        : key;
                                      return `- ${
                                        cleanKey
                                          .replace(/_/g, ' ')
                                          .split(' ')
                                          .filter(
                                            (w) =>
                                              w &&
                                              !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                w.toLowerCase(),
                                              ),
                                          )
                                          .map((w) => {
                                            const lower = w.toLowerCase();
                                            switch (lower) {
                                              case 'ii':
                                                return 'II';
                                              case 'iii':
                                                return 'III';
                                              case 'iv':
                                                return 'IV';
                                              case 'v':
                                                return 'V';
                                              case 'ix':
                                                return 'IX';
                                              case 'x':
                                                return 'X';
                                              default:
                                                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                            }
                                          })
                                          .join(' ') || rune.rune.replace(/^Rune:\s*/, '')
                                      }: **${
                                        /chance|percent/i.test(cleanKey)
                                          ? `${value}%`
                                          : /duration|cooldown/i.test(cleanKey)
                                            ? `${value}s`
                                            : value
                                      }**`;
                                    })
                                    .join('\n')
                                : '- No values configured'
                            }${
                              rune.subtraits && rune.subtraits.length > 0
                                ? '\n\n**Subtraits:**\n' +
                                  rune.subtraits
                                    .map((subtrait: any) =>
                                      Object.entries(subtrait.roll || {})
                                        .map(([key, value]) => {
                                          const subraidNamePrefix = (subtrait.subtrait ?? '')
                                            .replace(/^Secondary:\s*/, '')
                                            .toLowerCase()
                                            .replace(/\s+/g, '_');
                                          const cleanKey = key.startsWith(subraidNamePrefix + '_')
                                            ? key.slice(subraidNamePrefix.length + 1)
                                            : key;
                                          return `- ${
                                            cleanKey
                                              .replace(/_/g, ' ')
                                              .split(' ')
                                              .filter(
                                                (w) =>
                                                  w &&
                                                  !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                    w.toLowerCase(),
                                                  ),
                                              )
                                              .map((w) => {
                                                const lower = w.toLowerCase();
                                                switch (lower) {
                                                  case 'ii':
                                                    return 'II';
                                                  case 'iii':
                                                    return 'III';
                                                  case 'iv':
                                                    return 'IV';
                                                  case 'v':
                                                    return 'V';
                                                  case 'ix':
                                                    return 'IX';
                                                  case 'x':
                                                    return 'X';
                                                  default:
                                                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                                }
                                              })
                                              .join(' ') || (subtrait.subtrait ?? '').replace(/^Secondary:\s*/, '')
                                          }: **${
                                            /chance|percent/i.test(cleanKey)
                                              ? `${value}%`
                                              : /duration|cooldown/i.test(cleanKey)
                                                ? `${value}s`
                                                : value
                                          }**`;
                                        })
                                        .join('\n'),
                                    )
                                    .join('\n')
                                : ''
                            }`,
                          },
                          {
                            type: MessageComponentTypes.Separator,
                          },
                        ] satisfies MessageComponents,
                    ),
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'manage-rune',
                          placeholder: 'Select a rune to manage.',
                          options: (data.runes ?? []).map((rune: any, index: number) => ({
                            label: rune.rune?.replace('Rune: ', '') || `Rune ${index + 1}`,
                            value: String(rune.id),
                          })),
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              ...(((data.runes ?? []).length ?? 0) < (data.equipmentRuneSlots ?? 0)
                ? ([
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'select-rune',
                          placeholder: 'Available Runes:',
                          options: runes
                            .filter((rune: any) => rune.type === data.equipmentType)
                            .map((rune: any) => ({
                              label: rune.name,
                              value: rune.name,
                              description: rune.rarity,
                            })),
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-forge-results',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('remove-rune', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const runeIndex = (data.runes ?? []).findIndex((r: any) => r.id === data.runeTemp?.id);
      if (runeIndex === undefined || runeIndex < 0) return;

      const removedRune = (data.runes ?? [])[runeIndex];
      const removedRuneName = removedRune?.rune?.replace('Rune: ', '');

      (data.runes ??= []).splice(runeIndex, 1);
      selections.set(i.user.id.toString(), data);

      await i.respond({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon(Emoji.Correct)} ${pill(removedRuneName)} has been removed from your runes.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      const runes = await makeRequest('http://localhost:9998/runes', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
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
                type: MessageComponentTypes.TextDisplay,
                content: '# Rune Management\nManage the runes for your equipment here.',
              },
              {
                type: MessageComponentTypes.Separator,
              },
              ...((data.runes?.length ?? 0) > 0
                ? ([
                    ...(data.runes ?? []).flatMap(
                      (rune: any) =>
                        [
                          {
                            type: MessageComponentTypes.TextDisplay,
                            content: `## ${rune.rune.replace(/^Rune:\s*/, '')}\n${
                              rune.roll && Object.keys(rune.roll).length > 0
                                ? Object.entries(rune.roll)
                                    .map(([key, value]) => {
                                      const runeNamePrefix = rune.rune
                                        .replace(/^Rune:\s*/, '')
                                        .toLowerCase()
                                        .replace(/\s+/g, '_');
                                      const cleanKey = key.startsWith(runeNamePrefix + '_')
                                        ? key.slice(runeNamePrefix.length + 1)
                                        : key;
                                      return `- ${
                                        cleanKey
                                          .replace(/_/g, ' ')
                                          .split(' ')
                                          .filter(
                                            (w) =>
                                              w &&
                                              !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                w.toLowerCase(),
                                              ),
                                          )
                                          .map((w) => {
                                            const lower = w.toLowerCase();
                                            switch (lower) {
                                              case 'ii':
                                                return 'II';
                                              case 'iii':
                                                return 'III';
                                              case 'iv':
                                                return 'IV';
                                              case 'v':
                                                return 'V';
                                              case 'ix':
                                                return 'IX';
                                              case 'x':
                                                return 'X';
                                              default:
                                                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                            }
                                          })
                                          .join(' ') || rune.rune.replace(/^Rune:\s*/, '')
                                      }: **${
                                        /chance|percent/i.test(cleanKey)
                                          ? `${value}%`
                                          : /duration|cooldown/i.test(cleanKey)
                                            ? `${value}s`
                                            : value
                                      }**`;
                                    })
                                    .join('\n')
                                : '- No values configured'
                            }${
                              rune.subtraits && rune.subtraits.length > 0
                                ? '\n\n**Subtraits:**\n' +
                                  rune.subtraits
                                    .map((subtrait: any) =>
                                      Object.entries(subtrait.roll || {})
                                        .map(([key, value]) => {
                                          const subraidNamePrefix = (subtrait.subtrait ?? '')
                                            .replace(/^Secondary:\s*/, '')
                                            .toLowerCase()
                                            .replace(/\s+/g, '_');
                                          const cleanKey = key.startsWith(subraidNamePrefix + '_')
                                            ? key.slice(subraidNamePrefix.length + 1)
                                            : key;
                                          return `- ${
                                            cleanKey
                                              .replace(/_/g, ' ')
                                              .split(' ')
                                              .filter(
                                                (w) =>
                                                  w &&
                                                  !['per', 'second', 'weapon', 'armor', 'fraction', 'percent'].includes(
                                                    w.toLowerCase(),
                                                  ),
                                              )
                                              .map((w) => {
                                                const lower = w.toLowerCase();
                                                switch (lower) {
                                                  case 'ii':
                                                    return 'II';
                                                  case 'iii':
                                                    return 'III';
                                                  case 'iv':
                                                    return 'IV';
                                                  case 'v':
                                                    return 'V';
                                                  case 'ix':
                                                    return 'IX';
                                                  case 'x':
                                                    return 'X';
                                                  default:
                                                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                                                }
                                              })
                                              .join(' ') || (subtrait.subtrait ?? '').replace(/^Secondary:\s*/, '')
                                          }: **${
                                            /chance|percent/i.test(cleanKey)
                                              ? `${value}%`
                                              : /duration|cooldown/i.test(cleanKey)
                                                ? `${value}s`
                                                : value
                                          }**`;
                                        })
                                        .join('\n'),
                                    )
                                    .join('\n')
                                : ''
                            }`,
                          },
                          {
                            type: MessageComponentTypes.Separator,
                          },
                        ] satisfies MessageComponents,
                    ),
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'manage-rune',
                          placeholder: 'Select a rune to manage.',
                          options: (data.runes ?? []).map((rune: any, index: number) => ({
                            label: rune.rune?.replace('Rune: ', '') || `Rune ${index + 1}`,
                            value: String(rune.id),
                          })),
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              ...(((data.runes ?? []).length ?? 0) < (data.equipmentRuneSlots ?? 0)
                ? ([
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'select-rune',
                          placeholder: 'Available Runes:',
                          options: runes
                            .filter((rune: any) => rune.type === data.equipmentType)
                            .map((rune: any) => ({
                              label: rune.name,
                              value: rune.name,
                              description: rune.rarity,
                            })),
                        },
                      ],
                    },
                    {
                      type: MessageComponentTypes.Separator,
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-forge-results',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('view-forge-results', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const variants =
        data.equipmentType === 'Weapon'
          ? await makeRequest('http://localhost:9998/weapons', {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            })
          : await makeRequest('http://localhost:9998/armors', {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            });

      const equipment = await makeRequest('http://localhost:9998/forge/full-build', {
        method: RequestMethod.POST,
        response: ResponseType.JSON,
        body:
          data.equipmentType === 'Weapon'
            ? {
                race: data.race,
                achievement: data.achievement,
                weapon: {
                  world: data.world ?? "Stonewake's Cross",
                  recipe: Object.entries(data.ores ?? {})
                    .map(([name, quantity]) => `${quantity} ${name}`)
                    .join(', '),
                  category: data.category,
                  variant: (data.variant =
                    variants
                      .filter((e: any) => e.type === data.category)
                      .flatMap((e: any) => e.variants)
                      .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
                      .at(0)?.name ?? data.variant),
                  craft_quality_percent: data.quality,
                  enhancement: data.enhancement,
                  runes: data.runes,
                  lethality: data.lethality,
                },
              }
            : {
                race: data.race,
                achievement: data.achievement,
                armor: {
                  world: data.world ?? "Stonewake's Cross",
                  recipe: Object.entries(data.ores ?? {})
                    .map(([name, quantity]) => `${quantity} ${name}`)
                    .join(', '),
                  category: data.category,
                  variant: (data.variant =
                    variants
                      .filter((e: any) => e.type === data.category)
                      .flatMap((e: any) => e.variants)
                      .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
                      .at(0)?.name ?? data.variant),
                  craft_quality_percent: data.quality,
                  enhancement: data.enhancement,
                  runes: data.runes,
                },
              },
        headers: {
          'x-api-key': FORGE_API_KEY,
        },
      });

      data.equipmentRuneSlots =
        data.equipmentType === 'Weapon' ? equipment.weapon.rune_slots : equipment.armor.rune_slots;

      const validVariants = variants
        .filter((equipment: any) => equipment.type === data.category)
        .flatMap((equipment: any) =>
          equipment.variants.map((variant: any) => ({
            ...variant,
            type: equipment.type,
          })),
        )
        .filter(
          (v: any) =>
            v.name.toLowerCase() !==
            (data.equipmentType === 'Weapon'
              ? equipment.weapon.name
              : equipment.armor.name
            ).toLowerCase(),
        )
        .filter((v: any) => !v.from || v.from.includes(data.world ?? "Stonewake's Cross"))
        .map((v: any) => ({
          label: v.name,
          value: v.name,
        }));

      await i.deferEdit();
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
                    content: `# ${data.equipmentType === 'Weapon' ? equipment.weapon.name : equipment.armor.name}\n${
                      data.equipmentType === 'Weapon'
                        ? equipment.weapon.traits_rendered?.length
                          ? equipment.weapon.traits_rendered.map((t: any) => `> *${t.source}: ${t.trait}*`).join('\n')
                          : '\n> *None*'
                        : equipment.armor.traits_rendered?.length
                          ? equipment.armor.traits_rendered.map((t: any) => `> *${t.source}: ${t.trait}*`).join('\n')
                          : '\n> *None*'
                    }`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: data.equipmentType === 'Weapon' ? equipment.weapon.image : equipment.armor.image,
                  },
                },
              },
              ...(validVariants.length > 0
                ? [
                    {
                      type: MessageComponentTypes.ActionRow,
                      components: [
                        {
                          type: MessageComponentTypes.StringSelect,
                          customId: 'change-variant',
                          placeholder: 'View different variants.',
                          options: validVariants,
                        },
                      ],
                    },
                  ] satisfies MessageComponents
                : []),
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: 'Click the button on the right to view more options.',
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'forge-extra-options',
                  label: 'Extra',
                  style: ButtonStyles.Secondary,
                },
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${data.equipmentType === 'Weapon' ? `- Multiplier: **${equipment.weapon.avg_multi}x**\n- Forged Base Damage: **${equipment.weapon.base_damage_display}**\n- Attack Speed: **${equipment.weapon.final_attack_interval}s**\n- Effective DPS: **${equipment.weapon.dps.effective}**\n- Total Ores: **${equipment.weapon.total_ores}**\n- Sell Price: **${equipment.weapon.sell_price_display}**` : `- Multiplier: **${equipment.armor.avg_multi}x**\n- Defense: **${equipment.armor.defense}**\n- Sell Price: **${equipment.armor.sell_price_display}**`}`,
              },
              ...(data.race || data.quality || data.enhancement || data.achievement || (data.runes ?? []).length
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `## Extras:\n${[
                        data.race && `- Race: **${data.race}**`,
                        data.quality !== undefined && `- Quality: **${data.quality}**`,
                        data.enhancement && `- Enhancement: **+${data.enhancement}**`,
                        data.achievement?.name &&
                          data.achievement.stage &&
                          `- Achievement: **${data.achievement.name} (${data.achievement.stage})**`,
                        (data.runes ?? []).filter((r: any) => r).length &&
                          `- Runes:\n${(data.runes ?? [])
                            .filter((rune: any) => rune)
                            .map((rune: any) => `  - **${rune.rune.replace(/^Rune:\s*/, '')}**`)
                            .join('\n')}`,
                      ]
                        .filter(Boolean)
                        .join('\n')}`,
                    },
                  ] satisfies MessageComponents)
                : []),
              ...((data.equipmentType === 'Weapon' ? equipment.weapon.rune_slots >= 1 : equipment.armor.rune_slots >= 1)
                ? ([
                    {
                      type: MessageComponentTypes.Separator,
                    },
                    {
                      type: MessageComponentTypes.Section,
                      components: [
                        {
                          type: MessageComponentTypes.TextDisplay,
                          content: 'Click the button on the right to manage runes.',
                        },
                      ],
                      accessory: {
                        type: MessageComponentTypes.Button,
                        customId: 'manage-runes',
                        label: 'Runes',
                        style: ButtonStyles.Secondary,
                      },
                    },
                  ] satisfies MessageComponents)
                : []),
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'view-forge-chances',
                    label: 'Go Back',
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
    handlers.set('view-forge-chances', async (i) => {
      if (!i.data) return;

      const data = selections.get(i.user.id.toString());
      if (!data) return;

      const total = Object.values(data.ores ?? {}).reduce((sum, amount) => sum + amount, 0);
      if (!total) return;

      const equipmentChance =
        data.equipmentType === 'Weapon'
          ? await makeRequest(`http://localhost:9998/forge/weapon-chance`, {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              params: {
                world: data.world ?? "Stonewake's Cross",
                ores_total: total.toString(),
              },
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            })
          : await makeRequest(`http://localhost:9998/forge/armor-chance`, {
              method: RequestMethod.GET,
              response: ResponseType.JSON,
              params: {
                world: data.world ?? "Stonewake's Cross",
                ores_total: total.toString(),
              },
              headers: {
                'x-api-key': FORGE_API_KEY,
              },
            });

      await i.deferEdit();
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: '# Forge Results',
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `> *${Object.entries(data.ores ?? {})
                  .map(([ore, amount]) => `${amount} ${ore}`)
                  .join(', ')}*
                  ${Object.entries(data.ores ?? {})
                    .map(([ore, amount]) => `> *${ore} ${Math.round((amount / total) * 100)}%*`)
                    .join('\n')}`,
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `### You can change the world to forge new ${data.equipmentType}s!\nSelected World:\n- ${data.world ?? "Stonewake's Cross"}`,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'change-world',
                    placeholder: 'Change the world for different results.',
                    options: [
                      {
                        label: "Stonewake's Cross",
                        value: "Stonewake's Cross",
                      },
                      {
                        label: 'Forgotten Kingdom',
                        value: 'Forgotten Kingdom',
                      },
                      {
                        label: 'Frostspire Expanse',
                        value: 'Frostspire Expanse',
                      },
                      {
                        label: 'Crimson Sakura',
                        value: 'Crimson Sakura',
                      },
                    ].filter((option) => option.value !== data.world),
                  },
                ],
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: equipmentChance.chances
                  .map(
                    (w: any) =>
                      `- ${w.name} **(${w.chance_rounded_1dp})** - Min Ores: **${w.min_ores}**, Lockable: **${w.lockable}**`,
                  )
                  .join('\n'),
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.StringSelect,
                    customId: 'select-category',
                    placeholder: 'Select the desired category for your equipment.',
                    options: equipmentChance.chances.map((c: any) => ({
                      label: c.name,
                      value: c.name,
                    })),
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });

    collector.on('collect', async (i) => {
      if (!i.data?.customId) return;
      const handler = handlers.get(i.data.customId);
      if (handler) await handler(i);
    });

    collector.on('dispose', async () => {
      selections.delete(interaction.user.id.toString());

      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon(Emoji.Exclamation)} Forging session expired.\n-# Execute the command again to start a new session.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    });
  },
});
