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
import { ApplicationCommandCategory, RateLimitType, type Interaction } from 'types/types';
import { t } from 'utils/i18n';
import { icon, pill } from 'utils/markdown';
import { Schema } from 'utils/schema';
import or from 'utils/utils';

// TODO: Remake this eventually
createApplicationCommand({
  name: 'tag',
  description: "Send or manage your or your server's tags",
  descriptionLocalizations: {
    'pt-BR': 'Envie ou gerencie suas tags ou as tags do seu servidor',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Utility,
  },
  rateLimit: {
    type: RateLimitType.User,
    duration: 5,
    limit: 1,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.SubCommand,
      name: 'user',
      nameLocalizations: {
        'pt-BR': 'usuário',
      },
      description: 'Send or manage your tags',
      descriptionLocalizations: {
        'pt-BR': 'Envie ou gerencie suas tags',
      },
      options: [
        {
          type: ApplicationCommandOptionTypes.String,
          name: 'tag',
          description: 'The tag to send or manage',
          descriptionLocalizations: {
            'pt-BR': 'A tag a ser enviada ou gerenciada',
          },
          autocomplete: true,
          required: true,
        },
        {
          type: ApplicationCommandOptionTypes.Boolean,
          name: 'delete',
          nameLocalizations: {
            'pt-BR': 'deletar',
          },
          description: 'Delete a tag',
          descriptionLocalizations: {
            'pt-BR': 'Deletar uma tag',
          },
        },
      ],
    },
    {
      type: ApplicationCommandOptionTypes.SubCommand,
      name: 'server',
      nameLocalizations: {
        'pt-BR': 'servidor',
      },
      description: "Manage your server's tags",
      descriptionLocalizations: {
        'pt-BR': 'Gerencie as tags do seu servidor',
      },
      options: [
        {
          type: ApplicationCommandOptionTypes.String,
          name: 'tag',
          description: 'The tag to send or manage',
          descriptionLocalizations: {
            'pt-BR': 'A tag a ser enviada ou gerenciada',
          },
          autocomplete: true,
          required: true,
        },
        {
          type: ApplicationCommandOptionTypes.Boolean,
          name: 'delete',
          nameLocalizations: {
            'pt-BR': 'deletar',
          },
          description: 'Delete a tag',
          descriptionLocalizations: {
            'pt-BR': 'Deletar uma tag',
          },
        },
      ],
    },
  ],
  async autocomplete(bot, interaction, options, extras) {
    const focused = interaction.data?.options?.[0]?.options?.find((opt) => opt.focused)?.value?.toString();

    if (!focused) return;

    const choices: { name: string; value: any }[] = [];

    if (options.server) {
      if (!interaction.guildId) return;

      const records = await extras.xata.db.guild_tags.filter('guild_id', interaction.guildId.toString()).getAll();

      const filtered = records.filter((r: any) => r.name?.toLowerCase().startsWith(focused.toLowerCase())).slice(0, 25);

      for (const tag of filtered) {
        choices.push({
          name: tag.name,
          value: tag.name,
        });
      }
    } else if (options.user) {
      if (!interaction.user.id) return;

      const records = await extras.xata.db.user_tags.filter('user_id', interaction.user.id.toString()).getAll();

      const filtered = records.filter((r: any) => r.name?.toLowerCase().startsWith(focused.toLowerCase())).slice(0, 25);

      for (const tag of filtered) {
        choices.push({
          name: tag.name,
          value: tag.name,
        });
      }
    }

    await interaction.respond({ choices });
  },
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    const userId = interaction.user.id;

    if (options.server) {
      if (!interaction.guildId || !interaction.channelId) return;

      const guildId = interaction.guildId;
      const channelId = interaction.channelId;

      const name = options.server.tag;

      const record = await extras.xata.db.guild_tags.filter('guild_id', guildId.toString()).getAll();
      const exists = record.find((r) => r.name === name);

      if (options.server.delete === true) {
        if (!exists) {
          await interaction.respond({
            components: [
              {
                type: MessageComponentTypes.Container,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${icon('Error')} ${t(language, 'commands.tag.tagNotFound', { name: pill(name) })}`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          return;
        }

        await extras.xata.db.guild_tags.delete(exists.id);

        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Success')} ${t(language, 'commands.tag.tagDeleted', { name: pill(name) })}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      if (exists) {
        const tag = exists;

        let filesToSend: { name: string; blob: Blob }[] = [];
        if (tag.files?.length) {
          filesToSend = await Promise.all(
            tag.files.map(async (file: any) => {
              const res = await fetch(file.url);
              const arrayBuffer = await res.arrayBuffer();
              return {
                name: file.filename,
                blob: new Blob([arrayBuffer], { type: file.contentType }),
              };
            }),
          );
        }

        await bot.helpers.sendMessage(channelId, {
          content: `${tag.content ?? ''}\n${t(language, 'commands.tag.warn', { user: userId })}`,
          attachments:
            tag.files?.map((f: any, i: number) => ({
              id: i,
              filename: f.filename,
            })) ?? [],
          files: filesToSend,
        });

        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Success')} ${t(language, 'commands.tag.success', { name: pill(name) })}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.respond({
          title: t(language, 'commands.tag.modals.guildTitle'),
          customId: 'guild_tag_creation',
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: t(language, 'commands.tag.modals.guildHeader'),
            },
            {
              type: MessageComponentTypes.Label,
              label: t(language, 'commands.tag.modals.tagTextContent'),
              description: t(language, 'commands.tag.modals.tagTextContentDesc'),
              component: {
                type: MessageComponentTypes.TextInput,
                customId: 'guild_tag_content',
                placeholder: t(language, 'commands.tag.modals.tagTextContentPlaceholder'),
                style: TextStyles.Short,
                required: false,
              },
            },
            {
              type: MessageComponentTypes.Label,
              label: t(language, 'commands.tag.modals.tagFiles'),
              description: t(language, 'commands.tag.modals.tagFilesDesc'),
              component: {
                type: MessageComponentTypes.FileUpload,
                customId: 'guild_tag_files',
                maxValues: 4,
                required: false,
              },
            },
          ],
        });

        const collector = new Collector<Interaction>({
          max: 1,
          filter: (i) => i.user.id === userId && i.data?.customId === 'guild_tag_creation',
        });
        collectors.add(collector);

        collector.onCollect(async (i) => {
          if (!i.data) return;

          const tagContent = or(i.data.components?.[1]?.component?.value, null);
          const tagFileIds = or(i.data.components?.[2]?.component?.values, []);

          if (!tagContent && !tagFileIds) {
            await i.respond({
              components: [
                {
                  type: MessageComponentTypes.Container,
                  components: [
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `${icon('Warning')} ${t(language, 'commands.tag.modals.tagEmpty', { name: pill(name) })}`,
                    },
                  ],
                },
              ],
              flags: MessageFlags.IsComponentsV2,
            });

            return;
          }

          const tagFiles = [];

          for (const fileId of tagFileIds) {
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

            tagFiles.push({
              base64: urlBase64,
              url: attachment.url,
              filename: attachment.filename,
              contentType: attachment.contentType,
            });
          }

          const StickyMessageSchema = Schema.object({
            guild_id: Schema.string({ min: 1 }),
            content: Schema.string({ default: '' }),
            files: Schema.array<any[]>([]),
          });

          StickyMessageSchema.fields.guild_id.value = guildId.toString();
          StickyMessageSchema.fields.content.value = tagContent ?? '';
          StickyMessageSchema.fields.files.value = tagFiles;

          StickyMessageSchema.validate();

          await extras.xata.db.guild_tags.create({
            name: options.server.tag,
            guild_id: guildId.toString(),
            content: tagContent,
            files: tagFiles,
          });

          await i.respond({
            components: [
              {
                type: MessageComponentTypes.Container,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${icon('Success')} ${t(language, 'commands.tag.modals.tagSaved', { name: pill(name) })}`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        });
      }
    } else if (options.user) {
      if (!userId || !interaction.channelId) return;

      const channelId = interaction.channelId;

      const name = options.user.tag;

      const record = await extras.xata.db.user_tags.filter('user_id', userId.toString()).getAll();
      const exists = record.find((r) => r.name === name);

      if (options.user.delete === true) {
        if (!exists) {
          await interaction.respond({
            components: [
              {
                type: MessageComponentTypes.Container,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${icon('Error')} ${t(language, 'commands.tag.tagNotFound', { name: pill(name) })}`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          return;
        }

        await extras.xata.db.user_tags.delete(exists.id);

        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Success')} ${t(language, 'commands.tag.tagDeleted', { name: pill(name) })}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      if (exists) {
        const tag = exists;

        let filesToSend: { name: string; blob: Blob }[] = [];
        if (tag.files?.length) {
          filesToSend = await Promise.all(
            tag.files.map(async (file: any) => {
              const res = await fetch(file.url);
              const arrayBuffer = await res.arrayBuffer();

              return {
                name: file.filename,
                blob: new Blob([arrayBuffer], { type: file.contentType }),
              };
            }),
          );
        }

        await bot.helpers.sendMessage(channelId, {
          content: `${tag.content ?? ''}\n${t(language, 'commands.tag.warn', { user: userId })}`,
          attachments:
            tag.files?.map((f: any, i: number) => ({
              id: i,
              filename: f.filename,
            })) ?? [],
          files: filesToSend,
        });

        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Success')} ${t(language, 'commands.tag.success', { name: pill(name) })}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.respond({
          title: t(language, 'commands.tag.modals.userTitle'),
          customId: 'user_tag_creation',
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: t(language, 'commands.tag.modals.userHeader'),
            },
            {
              type: MessageComponentTypes.Label,
              label: t(language, 'commands.tag.modals.tagTextContent'),
              description: t(language, 'commands.tag.modals.tagTextContentDesc'),
              component: {
                type: MessageComponentTypes.TextInput,
                customId: 'user_tag_content',
                placeholder: t(language, 'commands.tag.modals.tagTextContentPlaceholder'),
                style: TextStyles.Short,
                required: false,
              },
            },
            {
              type: MessageComponentTypes.Label,
              label: t(language, 'commands.tag.modals.tagFiles'),
              description: t(language, 'commands.tag.modals.tagFilesDesc'),
              component: {
                type: MessageComponentTypes.FileUpload,
                customId: 'user_tag_files',
                maxValues: 4,
                required: false,
              },
            },
          ],
        });

        const collector = new Collector<Interaction>({
          max: 1,
          filter: (i) => i.user.id === userId && i.data?.customId === 'user_tag_creation',
        });
        collectors.add(collector);

        collector.onCollect(async (i) => {
          if (!i.data) return;

          const tagContent = or(i.data.components?.[1]?.component?.value, null);
          const tagFileIds = or(i.data.components?.[2]?.component?.values, []);

          if (!tagContent && !tagFileIds) {
            await i.respond({
              components: [
                {
                  type: MessageComponentTypes.Container,
                  components: [
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `${icon('Warning')} ${t(language, 'commands.tag.modals.tagEmpty', { name: pill(name) })}`,
                    },
                  ],
                },
              ],
              flags: MessageFlags.IsComponentsV2,
            });

            return;
          }

          const tagFiles = [];

          for (const fileId of tagFileIds) {
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

            tagFiles.push({
              base64: urlBase64,
              url: attachment.url,
              filename: attachment.filename,
              contentType: attachment.contentType,
            });
          }

          const StickyMessageSchema = Schema.object({
            user_id: Schema.string({ min: 1 }),
            content: Schema.string({ default: '' }),
            files: Schema.array<any[]>([]),
          });

          StickyMessageSchema.fields.user_id.value = userId.toString();
          StickyMessageSchema.fields.content.value = tagContent ?? '';
          StickyMessageSchema.fields.files.value = tagFiles;

          StickyMessageSchema.validate();

          await extras.xata.db.user_tags.create({
            name: options.user.tag,
            user_id: userId.toString(),
            content: tagContent,
            files: tagFiles,
          });

          await i.respond({
            components: [
              {
                type: MessageComponentTypes.Container,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${icon('Success')} ${t(language, 'commands.tag.modals.tagSaved', { name: pill(name) })}`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        });
      }
    }
  },
});
