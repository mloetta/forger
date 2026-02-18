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
  name: 'rune',
  description: 'View rune details',
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
      name: 'rune',
      description: 'Pick a rune to view',
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

    const res = await makeRequest('http://localhost:9998/runes', {
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
    const res = await makeRequest(`http://localhost:9998/runes`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.rune,
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
                  content: `# ${res.name}\n-# ${res.rarity} - ${res.type}${res.tier2_only ? ' (Tier 2 Only)' : ''}`,
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
                  customId: 'rune-obtainment',
                  placeholder: 'Obtainable From:',
                  options: res.obtainment.map((item: string) => ({
                    label: item,
                    value: item,
                  })),
                },
              ],
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Primary Traits:\n${res.primary_traits
                .map((trait: any) => {
                  return `**${trait.name}**\n*${trait.description}*${trait.value_range ? `\n- Value: **${trait.value_range.min.toLocaleString('en-US', { style: 'percent' })}${trait.value_range.max ? ` - ${trait.value_range.max.toLocaleString('en-US', { style: 'percent' })}` : ''}**` : ''}${trait.duration_range ? `\n- Duration: **${trait.duration_range.min.toLocaleString('en-US')}s${trait.duration_range.max ? ` - ${trait.duration_range.max.toLocaleString('en-US')}s` : ''}**` : ''}${trait.dot_per_second_weapon_fraction_range ? `\n- DoT/s: **${trait.dot_per_second_weapon_fraction_range.min.toLocaleString('en-US')}${trait.dot_per_second_weapon_fraction_range.max ? ` - ${trait.dot_per_second_weapon_fraction_range.max.toLocaleString('en-US')}` : ''}**` : ''}${trait.aoe_weapon_fraction_range ? `\n- AoE: **${trait.aoe_weapon_fraction_range.min.toLocaleString('en-US')}${trait.aoe_weapon_fraction_range.max ? ` - ${trait.aoe_weapon_fraction_range.max.toLocaleString('en-US')}` : ''}**` : ''}${trait.lifesteal_fraction_range ? `\n- Lifesteal: **${trait.lifesteal_fraction_range.min.toLocaleString('en-US')}${trait.lifesteal_fraction_range.max ? ` - ${trait.lifesteal_fraction_range.max.toLocaleString('en-US')}` : ''}**` : ''}${trait.reflect_fraction_range ? `\n- Reflect: **${trait.reflect_fraction_range.min.toLocaleString('en-US')}${trait.reflect_fraction_range.max ? ` - ${trait.reflect_fraction_range.max.toLocaleString('en-US')}` : ''}**` : ''}${trait.slow_percent_range ? `\n- Slow: **${trait.slow_percent_range.min.toLocaleString('en-US', { style: 'percent' })}${trait.slow_percent_range.max ? ` - ${trait.slow_percent_range.max.toLocaleString('en-US', { style: 'percent' })}` : ''}**` : ''}${trait.buff_percent_range ? `\n- Buff: **${trait.buff_percent_range.min.toLocaleString('en-US', { style: 'percent' })}${trait.buff_percent_range.max ? ` - ${trait.buff_percent_range.max.toLocaleString('en-US', { style: 'percent' })}` : ''}**` : ''}${trait.reduction_percent_range ? `\n- Reduction: **${trait.reduction_percent_range.min.toLocaleString('en-US', { style: 'percent' })}${trait.reduction_percent_range.max ? ` - ${trait.reduction_percent_range.max.toLocaleString('en-US', { style: 'percent' })}` : ''}**` : ''}${trait.notes ? `\n\n*${trait.notes}*` : ''}`;
                })
                .join('\n\n')}`,
            },
            ...(res.proc
              ? ([
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `## Rune Proc:\n**${res.proc.type}**${res.proc.notes ? `\n-# *${res.proc.notes}*` : ''}${res.proc.chance_range ? `\n- Chance: **${res.proc.chance_range.min.toLocaleString('en-US')}${res.proc.chance_range.max ? ` - ${res.proc.chance_range.max.toLocaleString('en-US')}` : ''}**` : ''}${res.proc.cooldown_range ? `\n- Cooldown: **${res.proc.cooldown_range.min.toLocaleString('en-US')}s${res.proc.cooldown_range.max ? ` - ${res.proc.cooldown_range.max.toLocaleString('en-US')}s` : ''}**` : ''}`,
                  },
                ] satisfies MessageComponents)
              : []),
            ...(res.is_tier2_available && res.allowed_subtrait_groups.length > 0
              ? ([
                  {
                    type: MessageComponentTypes.Separator,
                    divider: true,
                  },
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `## Tier 2 Information:\n**Subtrait Groups:**\n${res.allowed_subtrait_groups.map((group: string) => `- ${group}`).join('\n')}${res.tier2_notes ? `\n\n-# *${res.tier2_notes}*` : ''}`,
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
