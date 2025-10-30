import { collectors } from 'bot/events/interactions';
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
import { isInGuild } from 'types/typeguards';
import { ApplicationCommandCategory, ApplicationCommandScope, RateLimitType, type Interaction } from 'types/types';
import { t } from 'utils/i18n';
import { icon, iconAsEmoji, link } from 'utils/markdown';
import or from 'utils/utils';
import { getXataClient } from 'utils/xata';

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
  async run(interaction, options) {
    const language = interaction.locale!;

    if (isInGuild(interaction)) {
      const xata = getXataClient();

      const record = await xata.db.bot_guild_profile.filter('guild_id', interaction.guild.id.toString()).getFirst();
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
                  customId: isCustomized ? 'reset-customization' : 'customize',
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

        if (i.type === InteractionTypes.ModalSubmit && i.data.customId === 'customization-modal') {
          const newName = or(i.data.components?.[1]?.component?.value, null);
          const newAboutMe = or(i.data.components?.[2]?.component?.value, null);
          const newAvatarId = or(i.data.components?.[3]?.component?.value, null);
          const newBannerId = or(i.data.components?.[4]?.component?.value, null);
          const newAvatar = newAvatarId
            ? await urlToBase64(i.data.resolved!.attachments!.get(BigInt(newAvatarId))!.url)
            : null;
          const newBanner = newBannerId
            ? await urlToBase64(i.data.resolved!.attachments!.get(BigInt(newBannerId))!.url)
            : null;

          if (newName || newAboutMe || newAvatar || newBanner) {
            await interaction.bot.rest.editBotMember(i.guild.id, {
              nick: newName,
              bio: newAboutMe,
              avatar: newAvatar,
              banner: newBanner,
            });

            if (record) {
              await xata.db.bot_guild_profile.update(record.id, {
                nick: newName,
                about_me: newAboutMe,
                avatar_url: newAvatar,
                banner_url: newBanner,
              });
            } else {
              await xata.db.bot_guild_profile.create({
                guild_id: i.guild.id.toString(),
                nick: newName,
                about_me: newAboutMe,
                avatar_url: newAvatar,
                banner_url: newBanner,
              });
            }

            if (newName || newAboutMe || newAvatar || newBanner) {
              await i.respond({
                content: t(language, 'commands.help.modals.profileUpdated'),
                flags: MessageFlags.Ephemeral,
              });
            }
          } else {
            await i.respond({
              content: t(language, 'commands.help.modals.noChanges'),
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
              title: t(language, 'commands.help.buttons.missingPerm', {
                perm: 'ADMINISTRATOR',
              }),
              flags: MessageFlags.Ephemeral,
            });

            return;
          }

          await i.respond({
            title: t(language, 'commands.help.modals.title'),
            customId: 'customization-modal',
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
                  customId: 'new-name-input',
                  placeholder: t(language, 'commands.help.modals.blankValue'),
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
                  customId: 'new-about-input',
                  placeholder: t(language, 'commands.help.modals.blankValue'),
                  style: TextStyles.Paragraph,
                  required: false,
                },
              },
              {
                type: MessageComponentTypes.Label,
                label: 'How should my new avatar look like?',
                description: 'This is the avatar that appears on my guild profile',
                component: {
                  type: MessageComponentTypes.FileUpload,
                  customId: 'new-avatar',
                  maxValues: 1,
                },
              },
              {
                type: MessageComponentTypes.Label,
                label: 'How should my new banner look like?',
                description: 'This is the banner that appears on my guild profile',
                component: {
                  type: MessageComponentTypes.FileUpload,
                  customId: 'new-banner',
                  maxValues: 1,
                },
              },
            ],
          });
        } else if (i.data.customId === 'reset-customization') {
          await interaction.bot.rest.editBotMember(i.guild.id, {
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
              content: t(language, 'commands.help.buttons.missingPerm', {
                perm: 'MANAGE_WEBHOOKS',
              }),
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const channel = i.channel;
          const source = await i.bot.rest.getChannel('1383924380479918260');
          if (!channel || !source) return;

          if (source.type !== ChannelTypes.GuildAnnouncement) return;

          if (channel.type !== ChannelTypes.GuildText) {
            await i.edit(t(language, 'commands.help.buttons.wrongChannel'));

            return;
          }

          await interaction.bot.rest.followAnnouncement(source.id, channel.id!, 'Following updates from Pocket Tool');
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
                    customId: isCustomized ? 'reset-customization' : 'customize',
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
