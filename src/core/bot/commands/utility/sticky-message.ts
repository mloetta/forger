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
import or from 'utils/utils';
import { getXataClient } from 'utils/xata';

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
  async run(interaction, options) {
    const language = interaction.locale!;

    const xata = getXataClient();

    const record = await xata.db.sticky_messages.filter('guild_id', interaction.guild.id.toString()).getAll();

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

      await xata.db.sticky_messages.delete(exists.id);

      await interaction.respond({
        components: [
          {
            type: MessageComponentTypes.TextDisplay,
            content: `${icon('Success')} ${t(language, 'commands.sticky_message.stickyMessageDeleted')}`,
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.respond({
      title: t(language, 'commands.sticky_message.modal.title'),
      customId: 'sticky-message-setup',
      components: [
        {
          type: MessageComponentTypes.TextDisplay,
          content: t(language, 'commands.sticky_message.modal.header'),
        },
        {
          type: MessageComponentTypes.Label,
          label: t(language, 'commands.sticky_message.modal.stickyMessageTextContent'),
          description: t(language, 'commands.sticky_message.modal.stickyMessageTextContentDesc'),
          component: {
            type: MessageComponentTypes.TextInput,
            customId: 'sticky-message-content',
            placeholder: t(language, 'commands.sticky_message.modal.stickyMessageTextContentPlaceholder'),
            style: TextStyles.Short,
            required: false,
          },
        },
        {
          type: MessageComponentTypes.Label,
          label: t(language, 'commands.sticky_message.modal.stickyMessageFiles'),
          description: t(language, 'commands.sticky_message.modal.stickyMessageFilesDesc'),
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

      const stickyContent = or(i.data.components?.[1]?.component?.value, null);
      const stickyFilesIds = or(i.data.components?.[2]?.component?.values, null);

      if (!stickyContent && !stickyFilesIds) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${icon('Warning')} ${t(language, 'commands.sticky_message.modal.stickyMessageEmpty')}`,
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      let stickyFiles: any[] | null = null;

      if (stickyFilesIds?.length) {
        stickyFiles = [];

        for (const fileId of stickyFilesIds) {
          const attachment = i.data.resolved!.attachments!.get(BigInt(fileId));
          if (!attachment) continue;

          stickyFiles.push({
            base64: urlToBase64(attachment.url),
            url: attachment.url,
            filename: attachment.filename,
            contentType: attachment.contentType,
          });
        }
      }

      if (record.length >= 5 && !record.find((s) => s.channel_id === i.channel.id?.toString())) {
        await i.respond({
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${icon('Warning')} ${t(language, 'commands.sticky_message.modal.stickyMessageLimitReached')}`,
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        return;
      }

      const hasSticky = record.find((s) => s.channel_id === i.channel.id?.toString());

      if (hasSticky) {
        await xata.db.sticky_messages.update(hasSticky.id, {
          content: stickyContent,
          files: stickyFiles,
        });
      } else {
        await xata.db.sticky_messages.create({
          guild_id: i.guild.id.toString(),
          channel_id: i.channel.id?.toString(),
          content: stickyContent,
          files: stickyFiles,
        });
      }

      await i.respond({
        components: [
          {
            type: MessageComponentTypes.TextDisplay,
            content: `${icon('Success')} ${t(language, 'commands.sticky_message.modal.stickyMessageUpdated')}`,
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    });
  },
});
