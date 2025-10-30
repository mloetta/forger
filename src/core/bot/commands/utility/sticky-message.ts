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
        'pt-BR': 'Excluir',
      },
      description: 'Should the sticky message be deleted?',
      descriptionLocalizations: {
        'pt-BR': 'A mensagem persistente deve ser excluída?',
      },
      required: false,
    },
  ],
  async run(interaction, options) {
    const xata = getXataClient();

    const record = await xata.db.sticky_messages.filter('guild_id', interaction.guild.id.toString()).getAll();

    if (options.delete === true) {
      const exists = record.find((r) => r.channel_id === interaction.channel.id?.toString());

      if (!exists) {
        await interaction.respond({
          content: 'No sticky message found on this channel',
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      await xata.db.sticky_messages.delete(exists.id);

      await interaction.respond({
        content: 'Sticky message deleted successfully',
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.respond({
      title: 'Sticky Message Setup',
      customId: 'sticky-message-setup',
      components: [
        {
          type: MessageComponentTypes.TextDisplay,
          content: '## Configure the sticky message module for your server',
        },
        {
          type: MessageComponentTypes.Label,
          label: 'Should the sticky message have a text content?',
          description: 'Write down the content of the sticky message',
          component: {
            type: MessageComponentTypes.TextInput,
            customId: 'sticky-message-content',
            placeholder: 'Leave blank for no text content',
            style: TextStyles.Short,
          },
        },
        {
          type: MessageComponentTypes.Label,
          label: 'Should the sticky message have some files?',
          description: 'Upload the files you want your sticky message to have. Upload up to 4 files.',
          component: {
            type: MessageComponentTypes.FileUpload,
            customId: 'sticky-message-files',
            maxValues: 4,
          },
        },
      ],
    });

    const collector = new Collector<Interaction>({ max: 1 });
    collectors.add(collector);

    collector.onCollect(async (i) => {
      if (!i.data) return;

      const stickyContent = or(i.data.components?.[1]?.component?.value, null);
      const stickyFilesIds = or(i.data.components?.[2]?.component?.value, null);
      let stickyFiles: string[] | null = null;

      if (stickyFilesIds?.length) {
        stickyFiles = [];

        for (const fileId of stickyFilesIds) {
          const attachment = i.data.resolved!.attachments!.get(BigInt(fileId));
          if (!attachment) continue;
          const base64 = await urlToBase64(attachment.url);
          stickyFiles.push(base64);
        }
      }

      if (record.length >= 5 && !record.find((s) => s.channel_id === i.channel.id?.toString())) {
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
        content: 'Successfully updated sticky message!',
        flags: MessageFlags.Ephemeral,
      });
    });
  },
});
