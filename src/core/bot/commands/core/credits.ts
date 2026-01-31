import {
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory } from 'types/types';

createApplicationCommand({
  name: 'credits',
  description: 'Show credits for the bot',
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Core,
    cooldown: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Team\n@mloetta - Lead Developer\n@h0gtt - Developer\n@merpixhq - Designer`,
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Contributors\n@wolfypro - Host Provider\n@e.walk\n@dr.s.moller\n@woos_1\n@zach.08ll\n@daemi_rukiru`,
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: "This bot wouldn't exist without the support of our community! Thank you!",
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
