import { ApplicationCommandOptionTypes, MessageComponentTypes, MessageFlags } from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType } from 'types/types';
import { t } from 'utils/i18n';
import { icon } from 'utils/markdown';
import { readableTimeToMs } from 'utils/utils';

createApplicationCommand({
  name: 'remindme',
  nameLocalizations: {
    'pt-BR': 'lembrete',
  },
  description: 'Set a reminder for yourself',
  descriptionLocalizations: {
    'pt-BR': 'Defina um lembrete para si mesmo',
  },
  details: {
    category: ApplicationCommandCategory.Utility,
  },
  rateLimit: {
    type: RateLimitType.User,
    duration: 3,
    limit: 1,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'reason',
      nameLocalizations: {
        'pt-BR': 'motivo',
      },
      description: 'The reason for the reminder',
      descriptionLocalizations: {
        'pt-BR': 'O motivo do lembrete',
      },
      required: true,
    },
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'time',
      nameLocalizations: {
        'pt-BR': 'tempo',
      },
      description: 'The reminder time, e.g., 10m',
      descriptionLocalizations: {
        'pt-BR': 'Tempo do lembrete, por exemplo 10m',
      },
      required: true,
    },
  ],
  acknowledge: true,
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    const reason = options.reason;
    const time = readableTimeToMs(options.time);

    const userId = interaction.user.id;

    const reminderId = `${userId}:${Date.now()}`;

    await extras.redis.hSet(`reminder:${reminderId}`, {
      userId: userId.toString(),
      reason,
      time: time.toString(),
      createdAt: Date.now().toString(),
    });

    await extras.redis.zAdd('reminders', {
      score: Date.now() + time,
      value: reminderId,
    });

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${icon('Success')} ${t(language, 'commands.remindme.reminderCreated', { date: new Date(Date.now() + time).toLocaleString() })}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
