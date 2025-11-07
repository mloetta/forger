import { collectors } from 'bot/events/interactions';
import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  TextStyles,
  urlToBase64,
} from 'discordeno';
import { Collector } from 'helpers/collector';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, ApplicationCommandScope, RateLimitType, type Interaction } from 'types/types';
import { t } from 'utils/i18n';
import { icon } from 'utils/markdown';
import { Schema } from 'utils/schema';
import or from 'utils/utils';

createApplicationCommand({
  name: 'sticky-message',
  nameLocalizations: {
    'pt-BR': 'mensagem-persistente',
  },
  description: 'Configures the sticky message module for the actual channel',
  descriptionLocalizations: {
    'pt-BR': 'Configura o módulo de mensagem persistente para o canal atual',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall],
  contexts: [DiscordInteractionContextType.Guild],
  details: {
    category: ApplicationCommandCategory.Utility,
    scope: ApplicationCommandScope.Guild,
  },
  rateLimit: {
    type: RateLimitType.User,
    duration: 5,
    limit: 1,
  },
  permissions: {
    author: ['MANAGE_CHANNELS'],
    client: [],
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.Boolean,
      name: 'delete',
      nameLocalizations: {
        'pt-BR': 'excluir',
      },
      description: 'Should the sticky message be deleted?',
      descriptionLocalizations: {
        'pt-BR': 'A mensagem persistente deve ser excluída?',
      },
      required: false,
    },
  ],
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    const record = await extras.xata.db.sticky_messages.filter('guild_id', interaction.guild.id.toString()).getAll();

    if (options.delete === true) {
      const exists = record.find((r) => r.channel_id === interaction.channel.id?.toString());

      if (!exists) {
        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${icon('Error')} ${t(language, 'commands.sticky_message.stickyMessageNotFound')}`,
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      await extras.xata.db.sticky_messages.delete(exists.id);

      await interaction.respond({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Success')} ${t(language, 'commands.sticky_message.stickyMessageDeleted')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.respond({
      title: t(language, 'commands.sticky_message.modals.title'),
      customId: 'sticky-message-setup',
      components: [
        {
          type: MessageComponentTypes.TextDisplay,
          content: t(language, 'commands.sticky_message.modals.header'),
        },
        {
          type: MessageComponentTypes.Label,
          label: t(language, 'commands.sticky_message.modals.stickyMessageTextContent'),
          description: t(language, 'commands.sticky_message.modals.stickyMessageTextContentDesc'),
          component: {
            type: MessageComponentTypes.TextInput,
            customId: 'sticky-message-content',
            placeholder: t(language, 'commands.sticky_message.modals.stickyMessageTextContentPlaceholder'),
            style: TextStyles.Short,
            required: false,
          },
        },
        {
          type: MessageComponentTypes.Label,
          label: t(language, 'commands.sticky_message.modals.stickyMessageFiles'),
          description: t(language, 'commands.sticky_message.modals.stickyMessageFilesDesc'),
          component: {
            type: MessageComponentTypes.FileUpload,
            customId: 'sticky-message-files',
            maxValues: 4,
            required: false,
          },
        },
      ],
    });

    const collector = new Collector<Interaction>({ max: 1 });
    collectors.add(collector);

    collector.onCollect(async (i) => {
      if (!i.data) return;

      const channelId = i.channelId!.toString();
      const guildId = i.guildId!.toString();

      const stickyContent = or(i.data.components?.[1]?.component?.value, null);
      const stickyFilesIds = or(i.data.components?.[2]?.component?.values, []);

      if (!stickyContent && !stickyFilesIds) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Warning')} ${t(language, 'commands.sticky_message.modals.stickyMessageEmpty')}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      const stickyFiles = [];

      for (const fileId of stickyFilesIds) {
        const attachment = i.data.resolved?.attachments?.get(BigInt(fileId));
        if (!attachment) continue;

        const urlBase64 = await urlToBase64(attachment.url);

        const StickyFileSchema = Schema.object({
          base64: Schema.string({ min: 1, default: '' }),
          url: Schema.string({ min: 1, default: '' }),
          filename: Schema.string({ min: 1, default: '' }),
          contentType: Schema.string({ min: 1, default: '' }),
        });

        StickyFileSchema.fields.base64.value = urlBase64;
        StickyFileSchema.fields.url.value = attachment.url;
        StickyFileSchema.fields.filename.value = attachment.filename;
        StickyFileSchema.fields.contentType.value = attachment.contentType ?? '';

        StickyFileSchema.validate();

        stickyFiles.push({
          base64: urlBase64,
          url: attachment.url,
          filename: attachment.filename,
          contentType: attachment.contentType,
        });
      }

      if (record.length >= 5 && !record.find((s) => s.channel_id === channelId)) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Warning')} ${t(language, 'commands.sticky_message.modal.stickyMessageLimitReached')}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      const StickyMessageSchema = Schema.object({
        guild_id: Schema.string({ min: 1 }),
        channel_id: Schema.string({ min: 1 }),
        content: Schema.string({ default: '' }),
        files: Schema.array<any[]>([]),
      });

      StickyMessageSchema.fields.guild_id.value = guildId;
      StickyMessageSchema.fields.channel_id.value = channelId;
      StickyMessageSchema.fields.content.value = stickyContent ?? '';
      StickyMessageSchema.fields.files.value = stickyFiles;

      StickyMessageSchema.validate();

      const hasSticky = record.find((s) => s.channel_id === channelId);

      if (hasSticky) {
        await extras.xata.db.sticky_messages.update(hasSticky.id, {
          content: stickyContent,
          files: stickyFiles,
        });
      } else {
        await extras.xata.db.sticky_messages.create({
          guild_id: guildId,
          channel_id: channelId,
          content: stickyContent,
          files: stickyFiles,
        });
      }

      await i.respond({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Success')} ${t(language, 'commands.sticky_message.modals.stickyMessageUpdated')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    });
  },
});
