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
  name: 'achievement',
  description: 'View achievement details',
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
      name: 'achievement',
      description: 'Pick an achievement to view',
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

    const res = await makeRequest('http://localhost:9998/achievements', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        'x-api-key': FORGE_API_KEY,
      },
    });

    const choices = res
      .filter((achievement: any) => {
        if (!focused) return true;

        return achievement.name.toLowerCase().includes(focused);
      })
      .slice(0, 25)
      .map((achievement: any) => ({
        name: achievement.name,
        value: achievement.name,
      }));

    return interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const res = await makeRequest(`http://localhost:9998/achievements`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        name: options.achievement,
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
              type: MessageComponentTypes.TextDisplay,
              content: `# ${res.name}`,
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Stages:\n${res.stages.map((stage: any) => `Stage ${stage.stage}:\n- Requirement: **${stage.requirement.toLocaleString('en-US')} ${res.quest_type}**\n- Reward: **${stage.value.toLocaleString('en-US', { style: 'percent' })} ${stage.name}**`).join('\n\n')}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
