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
import { stringwrapPreserveWords } from 'utils/markdown';
import { makeRequest } from 'utils/request';

createApplicationCommand({
  name: 'ore',
  description: 'Views information about the selected ore',
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
      description: 'Pick an ore to view information about',
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

    const res = await makeRequest('http://localhost:9998/ores', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
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
    const res = await makeRequest(`http://localhost:9998/ores`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.ore,
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
                  content: `# ${res.name}\n-# ${res.rarity}\n*${res.description}*${typeof res.trait === 'string' ? `\n> ${res.trait}` : `\n-# *${res.trait.type}*\n> *${res.trait.description}*`}`,
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
                  placeholder: 'Obtainable From:',
                  options: res.from.flatMap((item: any) =>
                    item.world.map((world: string) => ({
                      label: world,
                      value: world,
                      description: stringwrapPreserveWords(item.rock.join(', '), 100),
                    })),
                  ),
                },
              ],
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `- Chance: **${res.chance}**\n- Multiplier: **${res.multiplier}x**\n- Price: **${res.price}**${res.unique_price_multiplier != null ? `\n- Unique Price Multiplier: **${res.unique_price_multiplier}x**` : ''}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
