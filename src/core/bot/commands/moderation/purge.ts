import {
  ApplicationCommandOptionTypes,
  ChannelTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, ApplicationCommandScope, RateLimitType } from 'types/types';
import { t } from 'utils/i18n';
import { highlight, icon } from 'utils/markdown';

createApplicationCommand({
  name: 'purge',
  nameLocalizations: {
    'pt-BR': 'limpar',
  },
  description: 'Delete messages in the current channel',
  descriptionLocalizations: {
    'pt-BR': 'Deleta mensagens no canal atual',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Moderation,
    scope: ApplicationCommandScope.Global,
  },
  permissions: {
    author: ['MANAGE_MESSAGES'],
    client: [],
  },
  rateLimit: {
    type: RateLimitType.Channel,
    limit: 1,
    duration: 5,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.Integer,
      name: 'amount',
      nameLocalizations: {
        'pt-BR': 'quantidade',
      },
      description: 'The amount of messages to delete',
      descriptionLocalizations: {
        'pt-BR': 'A quantidade de mensagens a serem deletadas',
      },
      minValue: 1,
      maxValue: 100,
      required: true,
    },
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'content',
      nameLocalizations: {
        'pt-BR': 'conteúdo',
      },
      description: 'The content of the messages to delete',
      descriptionLocalizations: {
        'pt-BR': 'O conteúdo das mensagens a serem deletadas',
      },
    },
  ],
  async run(bot, interaction, options) {
    const language = interaction.locale!;

    const amount = options.amount;
    const content = options.content;

    const channel = interaction.channel;

    const textBasedChannels = [
      ChannelTypes.AnnouncementThread,
      ChannelTypes.GuildAnnouncement,
      ChannelTypes.GuildText,
      ChannelTypes.PrivateThread,
      ChannelTypes.PublicThread,
    ];

    if (!textBasedChannels.includes(channel.type!)) {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.TextDisplay,
            content: `${icon('Error')} ${t(language, 'commands.purge.invalidChannelType')}`,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const messages = await bot.helpers.getMessages(interaction.channel.id!, { limit: amount + 1 });
    let filtered = messages;

    if (content) {
      filtered = messages.filter((msg) => msg.content === content && msg.id !== interaction.message?.id);
      if (filtered.length === 0) {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${icon('Error')} ${t(language, 'commands.purge.noMessagesWithContentFound', { content })}`,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }
    } else {
      filtered = messages.filter((msg) => msg.id !== interaction.message?.id);
      if (filtered.length === 0) {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${icon('Error')} ${t(language, 'commands.purge.noMessagesFound')}`,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }
    }

    await bot.helpers.deleteMessages(
      interaction.channel.id!,
      filtered.map((msg) => msg.id),
    );

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.TextDisplay,
          content: `${icon('Success')} ${t(language, 'commands.purge.success', { count: highlight(filtered.length) })}`,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
