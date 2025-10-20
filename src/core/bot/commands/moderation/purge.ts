import {
  ApplicationCommandOptionTypes,
  ChannelTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType } from 'types/types';

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
  async run(interaction, options) {
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
    }
  },
});
