import { collectors } from 'bot/events/interactions';
import { INVITE_LINK, SUPPORT_SERVER } from 'core/constants';
import {
  ButtonStyles,
  ChannelTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  InteractionTypes,
  MessageComponentTypes,
  MessageFlags,
  SeparatorSpacingSize,
  TextStyles,
  urlToBase64,
} from 'discordeno';
import { Collector } from 'helpers/collector';
import createApplicationCommand from 'helpers/command';
import { isInCachedGuild } from 'types/typeguards';
import { ApplicationCommandCategory, ApplicationCommandScope, RateLimitType, type Interaction } from 'types/types';
import { t } from 'utils/i18n';
import { icon, iconAsEmoji, link } from 'utils/markdown';
import { Schema } from 'utils/schema';
import or from 'utils/utils';

createApplicationCommand({
  name: 'help',
  nameLocalizations: {
    'pt-BR': 'ajuda',
  },
  description: 'Learn more about me and what I can do',
  descriptionLocalizations: {
    'pt-BR': 'Saiba mais sobre mim e o que posso fazer',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Core,
    scope: ApplicationCommandScope.Guild,
  },
  rateLimit: {
    type: RateLimitType.User,
    limit: 1,
    duration: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    if (await isInCachedGuild(interaction)) {
      const record = await extras.xata.db.bot_guild_profile
        .filter('guild_id', interaction.guild.id.toString())
        .getFirst();
      const isCustomized = Boolean(record);

      const message = await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: t(language, 'commands.help.header', {
                  website: link('https://komono-website.vercel.app/commands', t(language, 'generic.website')),
                }),
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: t(language, 'commands.help.locale', {
                  langSettings: link(
                    'https://support.discord.com/hc/en-us/articles/216406447-How-can-I-change-Discord-s-Language',
                    t(language, 'commands.help.langSettings'),
                  ),
                }),
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: t(language, 'commands.help.customization'),
              },
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: t(language, 'commands.help.customizationInfo'),
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: isCustomized ? 'reset_customization' : 'customize',
                  label: isCustomized
                    ? t(language, 'commands.help.buttons.reset')
                    : t(language, 'commands.help.buttons.customize'),
                  emoji: iconAsEmoji('Control'),
                  style: isCustomized ? ButtonStyles.Danger : ButtonStyles.Secondary,
                },
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Large,
                divider: true,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `-# ${icon('Info')} ${t(language, 'commands.help.disableCommands', { disableCommandsBlogPost: link('https://discord.com/blog/slash-commands-permissions-discord-apps-bots', t(language, 'commands.help.disableCommandsBlog')) })}`,
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    label: t(language, 'buttons.support'),
                    emoji: iconAsEmoji('Discord'),
                    url: SUPPORT_SERVER,
                    style: ButtonStyles.Link,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    label: t(language, 'buttons.invite'),
                    emoji: iconAsEmoji('Link'),
                    url: INVITE_LINK,
                    style: ButtonStyles.Link,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'follow_updates',
                    label: t(language, 'commands.help.buttons.follow'),
                    emoji: iconAsEmoji('Pin'),
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      const collector = new Collector<Interaction>();
      collectors.add(collector);

      collector.onCollect(async (i) => {
        if (!i.data) return;

        if (i.type === InteractionTypes.ModalSubmit && i.data.customId === 'customization_modal') {
          const newName = or(i.data.components?.[1]?.component?.value, null);
          const newAboutMe = or(i.data.components?.[2]?.component?.value, null);
          const newAvatarId = or(i.data.components?.[3]?.component?.value, null);
          const newBannerId = or(i.data.components?.[4]?.component?.value, null);
          const newAvatar = newAvatarId ? i.data.resolved?.attachments?.get(BigInt(newAvatarId)) : null;
          const newBanner = newBannerId ? i.data.resolved?.attachments?.get(BigInt(newBannerId)) : null;

          if (!newAvatar?.contentType?.startsWith('image/') || !newBanner?.contentType?.startsWith('image/')) {
            await i.respond({
              content: `${icon('Error')} ${t(language, 'commands.help.modals.invalidFormat')}`,
              flags: MessageFlags.Ephemeral,
            });

            return;
          }

          const newAvatarBase64 = await urlToBase64(newAvatar.url);
          const newBannerBase64 = await urlToBase64(newBanner.url);

          const BotProfileSchema = Schema.object({
            name: Schema.string({ min: 0, default: '' }),
            aboutMe: Schema.string({ min: 0, default: '' }),
            avatarUrl: Schema.string({ min: 0, default: '' }),
            bannerUrl: Schema.string({ min: 0, default: '' }),
          });

          BotProfileSchema.fields.name.value = newName ?? '';
          BotProfileSchema.fields.aboutMe.value = newAboutMe ?? '';
          BotProfileSchema.fields.avatarUrl.value = newAvatarBase64 ?? '';
          BotProfileSchema.fields.bannerUrl.value = newBannerBase64 ?? '';

          BotProfileSchema.validate();

          if (newName || newAboutMe || newAvatar || newBanner) {
            await bot.helpers.editBotMember(i.guild.id, {
              nick: newName,
              bio: newAboutMe,
              avatar: newAvatarBase64,
              banner: newBannerBase64,
            });

            if (record) {
              await extras.xata.db.bot_guild_profile.update(record.id, {
                nick: newName,
                about_me: newAboutMe,
                avatar_url: newAvatarBase64,
                banner_url: newBannerBase64,
              });
            } else {
              await extras.xata.db.bot_guild_profile.create({
                guild_id: i.guild.id.toString(),
                nick: newName,
                about_me: newAboutMe,
                avatar_url: newAvatarBase64,
                banner_url: newBannerBase64,
              });
            }

            if (newName || newAboutMe || newAvatar || newBanner) {
              await i.respond({
                content: `${icon('Success')} ${t(language, 'commands.help.modals.profileUpdated')}`,
                flags: MessageFlags.Ephemeral,
              });
            }
          } else {
            await i.respond({
              content: `${icon('Success')} ${t(language, 'commands.help.modals.noChanges')}`,
              flags: MessageFlags.Ephemeral,
            });
          }

          return;
        }

        // @ts-ignore
        if (i.message?.id !== message.id) return;

        if (i.data.customId === 'customize') {
          if (!i.member?.permissions?.has('ADMINISTRATOR')) {
            await i.respond({
              content: `${icon('Error')} ${t(language, 'commands.help.buttons.missingPerm', {
                perm: 'ADMINISTRATOR',
              })}`,
              flags: MessageFlags.Ephemeral,
            });

            return;
          }

          await i.respond({
            title: t(language, 'commands.help.modals.title'),
            customId: 'customization_modal',
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: t(language, 'commands.help.modals.header'),
              },
              {
                type: MessageComponentTypes.Label,
                label: t(language, 'commands.help.modals.name'),
                description: t(language, 'commands.help.modals.nameDesc'),
                component: {
                  type: MessageComponentTypes.TextInput,
                  customId: 'new_name_input',
                  placeholder: t(language, 'commands.help.modals.placeholder'),
                  style: TextStyles.Short,
                  required: false,
                },
              },
              {
                type: MessageComponentTypes.Label,
                label: t(language, 'commands.help.modals.aboutMe'),
                description: t(language, 'commands.help.modals.aboutMeDesc'),
                component: {
                  type: MessageComponentTypes.TextInput,
                  customId: 'new_about_input',
                  placeholder: t(language, 'commands.help.modals.placeholder'),
                  style: TextStyles.Paragraph,
                  required: false,
                },
              },
              {
                type: MessageComponentTypes.Label,
                label: t(language, 'commands.help.modals.avatar'),
                description: t(language, 'commands.help.modals.avatarDesc'),
                component: {
                  type: MessageComponentTypes.FileUpload,
                  customId: 'new_avatar',
                  maxValues: 1,
                  required: false,
                },
              },
              {
                type: MessageComponentTypes.Label,
                label: t(language, 'commands.help.modals.banner'),
                description: t(language, 'commands.help.modals.bannerDesc'),
                component: {
                  type: MessageComponentTypes.FileUpload,
                  customId: 'new_banner',
                  maxValues: 1,
                  required: false,
                },
              },
            ],
          });
        } else if (i.data.customId === 'reset_customization') {
          await bot.helpers.editBotMember(i.guild.id, {
            nick: null,
            avatar: null,
            banner: null,
            bio: null,
          });

          await record?.delete();

          await i.respond({
            content: t(language, 'commands.help.modals.resetCustomization'),
            flags: MessageFlags.Ephemeral,
          });
          return;
        } else if (i.data.customId === 'follow_updates') {
          await i.deferEdit();

          if (!i.member?.permissions?.has('MANAGE_WEBHOOKS')) {
            await i.respond({
              content: `${icon('Error')} ${t(language, 'commands.help.buttons.missingPerm', {
                perm: 'MANAGE_WEBHOOKS',
              })}`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const channel = i.channel;
          const source = await bot.helpers.getChannel('1383924380479918260');
          if (!channel || !source) return;

          if (source.type !== ChannelTypes.GuildAnnouncement) return;

          if (channel.type !== ChannelTypes.GuildText) {
            await i.edit(t(language, 'commands.help.buttons.wrongChannel'));

            return;
          }

          await bot.helpers.followAnnouncement(source.id, channel.id!);
        }
      });

      collector.onEnd(async () => {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: t(language, 'commands.help.header', {
                    website: link('https://komono-website.vercel.app/commands', t(language, 'generic.website')),
                  }),
                },
                {
                  type: MessageComponentTypes.Separator,
                  spacing: SeparatorSpacingSize.Small,
                  divider: false,
                },
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: t(language, 'commands.help.locale', {
                    langSettings: link(
                      'https://support.discord.com/hc/en-us/articles/216406447-How-can-I-change-Discord-s-Language',
                      t(language, 'commands.help.langSettings'),
                    ),
                  }),
                },
                {
                  type: MessageComponentTypes.Separator,
                  spacing: SeparatorSpacingSize.Small,
                  divider: false,
                },
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: t(language, 'commands.help.customization'),
                },
                {
                  type: MessageComponentTypes.Section,
                  components: [
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: t(language, 'commands.help.customizationInfo'),
                    },
                  ],
                  accessory: {
                    type: MessageComponentTypes.Button,
                    customId: isCustomized ? 'reset_customization' : 'customize',
                    label: isCustomized
                      ? t(language, 'commands.help.buttons.reset')
                      : t(language, 'commands.help.buttons.customize'),
                    emoji: iconAsEmoji('Control'),
                    style: isCustomized ? ButtonStyles.Danger : ButtonStyles.Secondary,
                    disabled: true,
                  },
                },
                {
                  type: MessageComponentTypes.Separator,
                  spacing: SeparatorSpacingSize.Large,
                  divider: true,
                },
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `-# ${icon('Info')} ${t(language, 'commands.help.disableCommands', { disableCommandsBlogPost: link('https://discord.com/blog/slash-commands-permissions-discord-apps-bots', t(language, 'commands.help.disableCommandsBlog')) })}`,
                },
                {
                  type: MessageComponentTypes.Separator,
                  spacing: SeparatorSpacingSize.Small,
                  divider: false,
                },
                {
                  type: MessageComponentTypes.ActionRow,
                  components: [
                    {
                      type: MessageComponentTypes.Button,
                      label: t(language, 'buttons.support'),
                      emoji: iconAsEmoji('Discord'),
                      url: 'https://discord.gg/7b234YFhmn',
                      style: ButtonStyles.Link,
                    },
                    {
                      type: MessageComponentTypes.Button,
                      label: t(language, 'buttons.invite'),
                      emoji: iconAsEmoji('Link'),
                      url: 'https://discord.com/oauth2/authorize?client_id=1240033877917962392',
                      style: ButtonStyles.Link,
                    },
                    {
                      type: MessageComponentTypes.Button,
                      customId: 'follow_updates',
                      label: t(language, 'commands.help.buttons.follow'),
                      emoji: iconAsEmoji('Pin'),
                      style: ButtonStyles.Secondary,
                      disabled: true,
                    },
                  ],
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      });
    } else {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: t(language, 'commands.help.header', {
                  website: link('https://komono-website.vercel.app/commands', t(language, 'generic.website')),
                }),
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: t(language, 'commands.help.locale', {
                  langSettings: link(
                    'https://support.discord.com/hc/en-us/articles/216406447-How-can-I-change-Discord-s-Language',
                    t(language, 'commands.help.langSettings'),
                  ),
                }),
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Large,
                divider: true,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `-# ${icon('Info')} ${t(language, 'commands.help.disableCommands', { disableCommandsBlogPost: link('https://discord.com/blog/slash-commands-permissions-discord-apps-bots', t(language, 'commands.help.disableCommandsBlog')) })}`,
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    label: t(language, 'buttons.support'),
                    emoji: iconAsEmoji('Discord'),
                    url: SUPPORT_SERVER,
                    style: ButtonStyles.Link,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    label: t(language, 'buttons.invite'),
                    emoji: iconAsEmoji('Link'),
                    url: INVITE_LINK,
                    style: ButtonStyles.Link,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
});
