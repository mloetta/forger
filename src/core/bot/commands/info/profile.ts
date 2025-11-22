import {
  ApplicationCommandOptionTypes,
  avatarUrl,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  iconBigintToHash,
  MessageComponentTypes,
  MessageFlags,
  SeparatorSpacingSize,
  snowflakeToTimestamp,
  UserFlags,
  type Application,
  type TextDisplayComponent,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType } from 'types/types';
import type { Emojis } from 'utils/emojis';
import { t } from 'utils/i18n';
import { icon, iconPill, link, pill, smallPill, timestamp, TimestampStyle } from 'utils/markdown';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';
import or from 'utils/utils';

createApplicationCommand({
  name: 'profile',
  nameLocalizations: {
    'pt-BR': 'perfil',
  },
  description: 'View a user or bot profile',
  descriptionLocalizations: {
    'pt-BR': 'Veja o perfil de um usuário ou bot',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Info,
  },
  rateLimit: {
    type: RateLimitType.User,
    duration: 3,
    limit: 1,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.User,
      name: 'target',
      nameLocalizations: {
        'pt-BR': 'alvo',
      },
      description: 'The user or bot to view info',
      descriptionLocalizations: {
        'pt-BR': 'O usuário ou bot para ver as informações',
      },
    },
  ],
  acknowledge: true,
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    const target = await bot.helpers.getUser(or(options?.target?.user.id, interaction.user.id));

    if (!target) {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: t(language, 'commands.profile.targetNotFound'),
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    if (target.bot) {
      const appFlags = {
        EMBEDDED_RELEASED: 1,
        GATEWAY_PRESENCE: 12,
        GATEWAY_PRESENCE_LIMITED: 13,
        GATEWAY_GUILD_MEMBERS: 14,
        GATEWAY_GUILD_MEMBERS_LIMITED: 15,
        VERIFICATION_PENDING_GUILD_LIMIT: 16,
        EMBEDDED: 17,
        GATEWAY_MESSAGE_CONTENT: 18,
        GATEWAY_MESSAGE_CONTENT_LIMITED: 19,
        EMBEDDED_FIRST_PARTY: 20,
        HAS_SLASH_COMMAND: 23,
      };

      const appFlagNames = {
        EMBEDDED_RELEASED: t(language, 'commands.profile.EMBEDDED_RELEASED'),
        GATEWAY_PRESENCE: t(language, 'commands.profile.GATEWAY_PRESENCE'),
        GATEWAY_PRESENCE_LIMITED: t(language, 'commands.profile.GATEWAY_PRESENCE_LIMITED'),
        GATEWAY_GUILD_MEMBERS: t(language, 'commands.profile.GATEWAY_GUILD_MEMBERS'),
        GATEWAY_GUILD_MEMBERS_LIMITED: t(language, 'commands.profile.GATEWAY_GUILD_MEMBERS_LIMITED'),
        VERIFICATION_PENDING_GUILD_LIMIT: t(language, 'commands.profile.VERIFICATION_PENDING_GUILD_LIMIT'),
        EMBEDDED: t(language, 'commands.profile.EMBEDDED'),
        GATEWAY_MESSAGE_CONTENT: t(language, 'commands.profile.GATEWAY_MESSAGE_CONTENT'),
        GATEWAY_MESSAGE_CONTENT_LIMITED: t(language, 'commands.profile.GATEWAY_MESSAGE_CONTENT_LIMITED'),
        EMBEDDED_FIRST_PARTY: t(language, 'commands.profile.EMBEDDED_FIRST_PARTY'),
        HAS_SLASH_COMMAND: t(language, 'commands.profile.HAS_SLASH_COMMAND', {
          slash: icon('Slash'),
        }),
      };

      const app = (await makeRequest(`https://discord.com/api/v10/applications/${target.id}/rpc`, {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
      })) as Application;

      if (!app) {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Error')} ${t(language, 'commands.profile.applicationFetchError')}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      let tags;
      let links;
      let flags;

      const tagArr = app.tags;
      if (tagArr) {
        const formattedTags = tagArr.map((tag: any) => smallPill(tag)).join(', ');
        tags = `${iconPill('Tag', 'Tags')}\n${formattedTags}`;
      }

      const linksArr = [
        app.termsOfServiceUrl ? `- ${link(app.termsOfServiceUrl, t(language, 'commands.profile.TOS'))}` : null,
        app.privacyPolicyUrl ? `- ${link(app.privacyPolicyUrl, t(language, 'commands.profile.privacyPolicy'))}` : null,
        `- ${link(
          `https://discord.com/oauth2/authorize?client_id=${app.id}&scope=bot%20applications.commands`,
          'Invite Link',
        )}`,
      ].filter(Boolean);

      if (linksArr) {
        links = `${iconPill('Link', t(language, 'generic.links'))}\n${linksArr.join('\n')}`.trim();
      } else {
        links = '';
      }

      const flagList = Object.entries(appFlags)
        .filter(([_, flagValue]) => app.flags! & (1 << flagValue))
        .map(([key]) => appFlagNames[key as keyof typeof appFlagNames] || key.replace(/_/g, ' ').toLowerCase());

      if (flagList.length > 0) {
        flags = `${iconPill('Flag', t(language, 'generic.flags'))}\n${flagList.map((flag) => `- ${flag}`).join('\n')}\n`;
      }

      const sections = [tags, links, flags]
        .map((section) => section?.trim())
        .filter((section) => section && section !== '');

      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${icon('Mention')} **${target.username}** ${pill(app.id)}\n${app.description || ''}`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: target.avatar ? iconBigintToHash(target.avatar) : avatarUrl(target.id, target.discriminator),
                  },
                },
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Large,
                divider: true,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: sections.join('\n\n'),
              },
            ],
          },
        ],
      });
    } else {
      const member = await bot.helpers.getMember(interaction.guild.id, target.id);

      let flags: (keyof typeof Emojis)[] = [];
      if (target.publicFlags) {
        switch (target.publicFlags.bitfield) {
          case UserFlags.DiscordEmployee: {
            flags.push('Staff');
            break;
          }
          case UserFlags.PartneredServerOwner: {
            flags.push('Partner');
            break;
          }
          case UserFlags.HypeSquadEventsMember: {
            flags.push('Hypesquad');
            break;
          }
          case UserFlags.BugHunterLevel1: {
            flags.push('BugHunterLevel1');
            break;
          }
          case UserFlags.HouseBravery: {
            flags.push('HypeSquadOnlineHouse1');
            break;
          }
          case UserFlags.HouseBrilliance: {
            flags.push('HypeSquadOnlineHouse2');
            break;
          }
          case UserFlags.HouseBalance: {
            flags.push('HypeSquadOnlineHouse3');
            break;
          }
          case UserFlags.EarlySupporter: {
            flags.push('PremiumEarlySupporter');
            break;
          }
          case UserFlags.BugHunterLevel2: {
            flags.push('BugHunterLevel2');
            break;
          }
          case UserFlags.EarlyVerifiedBotDeveloper: {
            flags.push('VerifiedDeveloper');
            break;
          }
          case UserFlags.DiscordCertifiedModerator: {
            flags.push('CertifiedModerator');
            break;
          }
          case UserFlags.ActiveDeveloper: {
            flags.push('ActiveDeveloper');
            break;
          }
        }
      }

      const avatarHash = target.avatar ? iconBigintToHash(target.avatar) : null;

      if (target.banner || avatarHash?.startsWith('a_')) {
        flags.push('Nitro');
      }

      // A bunch of user info we can show
      const avatar =
        (member?.avatar ? iconBigintToHash(member.avatar) : null) ??
        (target.avatar ? iconBigintToHash(target.avatar) : null) ??
        avatarUrl(target.id, target.discriminator);
      const badges = flags.map((flag) => icon(flag)).join('');
      const nick = member.nick;
      const createdAt = snowflakeToTimestamp(target.id);
      const joinedAt = Number(member.joinedAt);

      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${icon('Mention')} **${target.username}** ${pill(target.id)} ${badges ? `\n${badges}` : ''}`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: avatar,
                  },
                },
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Large,
                divider: true,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${iconPill('Member', t(language, 'commands.profile.display'))}\n${smallPill(member ? nick : target.username)}`,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${iconPill('Calendar', t(language, 'commands.profile.accountCreatedAt'))}\n${timestamp(createdAt, TimestampStyle.LongDate)}`,
              },
              ...(member
                ? [
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `${iconPill('Greenie', t(language, 'commands.profile.memberJoinedAt'))}\n${timestamp(joinedAt, TimestampStyle.LongDate)}`,
                    } satisfies TextDisplayComponent,
                  ]
                : []),
            ],
          },
        ],
      });
    }
  },
});
