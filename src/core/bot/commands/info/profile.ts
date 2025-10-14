import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  SeparatorSpacingSize,
  snowflakeToBigint,
  type Application,
  type TextDisplayComponent,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType } from 'types/types';
import type { Emojis } from 'utils/emojis';
import { icon, iconPill, link, pill, smallPill, timestamp } from 'utils/markdown';
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
  rateLimit: {
    type: RateLimitType.User,
    limit: 1,
    duration: 5,
  },
  acknowledge: true,
  async run(interaction, options) {
    const language = interaction.locale;

    const target = await interaction.bot.rest.getUser(or(options?.target?.user.id, interaction.user.id));

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
        EMBEDDED_RELEASED: 'Embedded Released',
        GATEWAY_PRESENCE: 'Presence Intent',
        GATEWAY_PRESENCE_LIMITED: 'Presence Intent (Not approved)',
        GATEWAY_GUILD_MEMBERS: 'Server Members Intent',
        GATEWAY_GUILD_MEMBERS_LIMITED: 'Server Members Intent (Not approved)',
        VERIFICATION_PENDING_GUILD_LIMIT: 'Pending Server Limit',
        EMBEDDED: 'Embedded',
        GATEWAY_MESSAGE_CONTENT: 'Message Content Intent',
        GATEWAY_MESSAGE_CONTENT_LIMITED: 'Message Content Intent (Not approved)',
        EMBEDDED_FIRST_PARTY: 'Embedded First Party',
        HAS_SLASH_COMMAND: `Has Slash Commands ${icon('Slash')}`,
      };

      const req = await fetch(`https://discord.com/api/v10/applications/${target.id}/rpc`, {
        method: 'GET',
      });

      if (!req.ok) {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Error')} Unable to fetch application information`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      const app = (await req.json()) as Application;

      let tags;
      let links;
      let flags;

      const tagArr = app.tags;
      if (tagArr) {
        const formattedTags = tagArr.map((tag: any) => smallPill(tag)).join(', ');
        tags = `${iconPill('Tag', 'Tags')}\n${formattedTags}`;
      }

      const linksArr = [
        app.termsOfServiceUrl ? `- ${link(app.termsOfServiceUrl, 'Terms of Service')}` : null,
        app.privacyPolicyUrl ? `- ${link(app.privacyPolicyUrl, 'Privacy Policy')}` : null,
        `- ${link(
          `https://discord.com/oauth2/authorize?client_id=${app.id}&scope=bot%20applications.commands`,
          'Invite Link',
        )}`,
      ].filter(Boolean);

      if (linksArr) {
        links = `${iconPill('Link', 'Links')}\n${linksArr.join('\n')}`.trim();
      } else {
        links = '';
      }

      const flagList = Object.entries(appFlags)
        .filter(([_, flagValue]) => app.flags! & (1 << flagValue))
        .map(([key]) => appFlagNames[key as keyof typeof appFlagNames] || key.replace(/_/g, ' ').toLowerCase());

      if (flagList.length > 0) {
        flags = `${iconPill('Flag', 'Flags')}\n${flagList.map((flag) => `- ${flag}`).join('\n')}\n`;
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
                    url: target.avatar!,
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
      const member = await interaction.bot.rest.getMember(interaction.guild.id, target.id);

      let badges: (keyof typeof Emojis)[] = [];
      if (target.flags) {
        switch (target.flags) {
          case 1 << 0: {
            badges.push('Staff');
            break;
          }
          case 1 << 1: {
            badges.push('Partner');
            break;
          }
          case 1 << 2: {
            badges.push('Hypesquad');
            break;
          }
          case 1 << 3: {
            badges.push('BugHunterLevel1');
            break;
          }
          case 1 << 6: {
            badges.push('HypeSquadOnlineHouse1');
            break;
          }
          case 1 << 7: {
            badges.push('HypeSquadOnlineHouse2');
            break;
          }
          case 1 << 8: {
            badges.push('HypeSquadOnlineHouse3');
            break;
          }
          case 1 << 9: {
            badges.push('PremiumEarlySupporter');
            break;
          }
          case 1 << 14: {
            badges.push('BugHunterLevel2');
            break;
          }
          case 1 << 17: {
            badges.push('VerifiedDeveloper');
            break;
          }
          case 1 << 18: {
            badges.push('CertifiedModerator');
            break;
          }
          case 1 << 22: {
            badges.push('ActiveDeveloper');
            break;
          }
        }
      }

      if (target.banner || target.avatar?.endsWith('gif')) {
        badges.push('Nitro');
      }

      const badgeIcons = badges.map((badge) => icon(badge)).join('');

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
                    content: `${icon('Mention')} **${target.username}** ${pill(target.id)} ${badgeIcons ? `\n${badgeIcons}` : ''}`,
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Thumbnail,
                  media: {
                    url: target.avatar!,
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
                content: `${iconPill('Member', 'Display')}\n${smallPill(member ? member.nick : target.username)}`,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${iconPill('Calendar', 'Created at')}\n${timestamp(Math.floor((Number(snowflakeToBigint(target.id) >> 22n) + 1420070400000) / 1000), 'D')}`,
              },
              ...(member
                ? [
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `${iconPill('Greenie', 'Joined at')}\n${timestamp(Number(member.joinedAt), 'D')}`,
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
