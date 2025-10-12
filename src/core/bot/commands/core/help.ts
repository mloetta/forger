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
  type ButtonComponent,
} from 'discordeno';
import { Collector } from 'helpers/collector';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType, type Interaction } from 'types/types';
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
  },
  rateLimit: {
    type: RateLimitType.User,
    limit: 1,
    duration: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    const language = interaction.locale!;

    const xata = getXataClient();

    const isInGuild = interaction.authorizingIntegrationOwners[0] === interaction.guild.id;

    if (isInGuild) {
      const record = await xata.db.botGuildProfile.filter('guild_id', interaction.guild.id.toString()).getFirst();
      const isCustomized = Boolean(record);

      const customizationButton = {
        type: MessageComponentTypes.Button,
        customId: isCustomized ? 'reset-customization' : 'customize',
        label: isCustomized
          ? t(language, 'commands.help.buttons.reset')
          : t(language, 'commands.help.buttons.customize'),
        emoji: iconAsEmoji('Control'),
        style: isCustomized ? ButtonStyles.Danger : ButtonStyles.Secondary,
      } satisfies ButtonComponent;

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
                accessory: customizationButton as any,
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
        if (i.type === InteractionTypes.ModalSubmit && i.data?.customId === 'customization-modal') {
          const newName = or(i.data.components?.[1]?.component?.value, null);
          const newAboutMe = or(i.data.components?.[2]?.component?.value, null);

          if (newName || newAboutMe) {
            await bot.rest.editBotMember(i.guild.id, {
              nick: newName,
              bio: newAboutMe,
            });

            if (record) {
              await xata.db.botGuildProfile.update(record.id, {
                nick: newName,
                about_me: newAboutMe,
              });
            } else {
              await xata.db.botGuildProfile.create({
                guild_id: i.guild.id.toString(),
                nick: newName,
                about_me: newAboutMe,
              });
            }

            if (newName && newAboutMe) {
              await i.respond({
                content: t(language, 'commands.help.modals.profileUpdated'),
                flags: MessageFlags.Ephemeral,
              });
            } else if (newName) {
              await i.respond({
                content: t(language, 'commands.help.modals.nameUpdated'),
                flags: MessageFlags.Ephemeral,
              });
            } else if (newAboutMe) {
              await i.respond({
                content: t(language, 'commands.help.modals.aboutMeUpdated'),
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

        if (i.data?.customId === 'customize') {
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
            ],
          });
        } else if (i.data?.customId === 'reset-customization') {
          await bot.rest.editBotMember(i.guild.id, {
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
        } else if (i.data?.customId === 'follow_updates') {
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

          await bot.rest.followAnnouncement(source.id, channel.id!, 'Following updates from Pocket Tool');
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
                    ...customizationButton,
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
