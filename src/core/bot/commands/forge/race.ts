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
import { makeRequest } from 'utils/request';

createApplicationCommand({
  name: 'race',
  description: 'View race details',
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
      name: 'race',
      description: 'Pick a race to view',
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

    const res = await makeRequest('http://localhost:9998/races', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    const choices = res
      .filter((race: any) => {
        if (!focused) return true;

        return race.name.toLowerCase().includes(focused);
      })
      .slice(0, 25)
      .map((race: any) => ({
        name: race.name,
        value: race.name,
      }));

    return interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9998/races`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.race,
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
                  content: `# ${res.name}\n-# ${res.rarity} (${res.drop_rate.toLocaleString('en-US', {
                    style: 'percent',
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })})`,
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
              content: `## Perks:\n${res.perks
                .map((perk: any) => `**${perk.name}**\n- *${perk.description}*`)
                .join('\n\n')}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
