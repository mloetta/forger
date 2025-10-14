import {
  ApplicationCommandOptionTypes,
  ButtonStyles,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  type Component,
  type MessageComponents,
  type PermissionStrings,
} from 'discordeno';
import { Collector } from 'helpers/collector';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType, type Interaction } from 'types/types';
import { t } from 'utils/i18n';
import List from 'utils/list';
import { icon, iconAsEmoji, iconPill, pill, smallPill } from 'utils/markdown';
import { collectors } from 'bot/events/interactions';

createApplicationCommand({
  name: 'role',
  nameLocalizations: {
    'pt-BR': 'cargo',
  },
  description: 'Get information about a role',
  descriptionLocalizations: {
    'pt-BR': 'Obtenha informações sobre um cargo',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall],
  contexts: [DiscordInteractionContextType.Guild],
  details: {
    category: ApplicationCommandCategory.Info,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.Role,
      name: 'role',
      nameLocalizations: {
        'pt-BR': 'cargo',
      },
      description: 'The role to get information about',
      descriptionLocalizations: {
        'pt-BR': 'O cargo para obter informações',
      },
      required: true,
    },
  ],
  rateLimit: {
    type: RateLimitType.User,
    limit: 1,
    duration: 5,
  },
  acknowledge: true,
  async run(interaction, options) {
    const language = interaction.locale!;

    const role = options.role;

    const permissions = role.permissions;

    interface Categories {
      General: { emoji: any; permissions: PermissionStrings[] };
      Membership: {
        emoji: any;
        permissions: PermissionStrings[];
      };
      'Text Channel': {
        emoji: any;
        permissions: PermissionStrings[];
      };
      'Voice Channel': {
        emoji: any;
        permissions: PermissionStrings[];
      };
      App: { emoji: any; permissions: PermissionStrings[] };
      Events: { emoji: any; permissions: PermissionStrings[] };
      'Stage Channel': {
        emoji: any;
        permissions: PermissionStrings[];
      };
    }

    const categories: Categories = {
      General: {
        emoji: icon('Core'),
        permissions: [
          'VIEW_CHANNEL',
          'MANAGE_CHANNELS',
          'MANAGE_ROLES',
          'MANAGE_GUILD_EXPRESSIONS',
          'CREATE_GUILD_EXPRESSIONS',
          'VIEW_AUDIT_LOG',
          'VIEW_GUILD_INSIGHTS',
          'VIEW_CREATOR_MONETIZATION_ANALYTICS',
          'MANAGE_WEBHOOKS',
          'MANAGE_GUILD',
        ],
      },
      Membership: {
        emoji: icon('Member'),
        permissions: [
          'CREATE_INSTANT_INVITE',
          'CHANGE_NICKNAME',
          'MANAGE_NICKNAMES',
          'KICK_MEMBERS',
          'BAN_MEMBERS',
          'MODERATE_MEMBERS',
        ],
      },
      'Text Channel': {
        emoji: icon('Channel'),
        permissions: [
          'SEND_MESSAGES',
          'SEND_MESSAGES_IN_THREADS',
          'CREATE_PUBLIC_THREADS',
          'CREATE_PRIVATE_THREADS',
          'EMBED_LINKS',
          'ATTACH_FILES',
          'ADD_REACTIONS',
          'USE_EXTERNAL_EMOJIS',
          'USE_EXTERNAL_STICKERS',
          'MENTION_EVERYONE',
          'MANAGE_MESSAGES',
          'PIN_MESSAGES',
          'MANAGE_THREADS',
          'READ_MESSAGE_HISTORY',
          'SEND_TTS_MESSAGES',
          'SEND_VOICE_MESSAGES',
          'SEND_POLLS',
        ],
      },
      'Voice Channel': {
        emoji: icon('Audio'),
        permissions: [
          'CONNECT',
          'SPEAK',
          'STREAM',
          'USE_SOUNDBOARD',
          'USE_EXTERNAL_SOUNDS',
          'USE_VAD',
          'PRIORITY_SPEAKER',
          'MUTE_MEMBERS',
          'DEAFEN_MEMBERS',
          'MOVE_MEMBERS',
        ],
      },
      App: {
        emoji: icon('Bot'),
        permissions: ['USE_SLASH_COMMANDS', 'USE_EMBEDDED_ACTIVITIES', 'USE_EXTERNAL_APPS'],
      },
      'Stage Channel': {
        emoji: icon('Stage'),
        permissions: ['REQUEST_TO_SPEAK'],
      },
      Events: {
        emoji: icon('Calendar'),
        permissions: ['CREATE_EVENTS', 'MANAGE_EVENTS'],
      },
    };

    const categoriesList = new List(...(Object.keys(categories) as Array<keyof Categories>)).loop(true);

    const makeContent = () => {
      const key = categoriesList.current!;
      const cat = categories[key];

      const permText = cat.permissions
        .map((perm) => {
          const hasPerm = permissions.has(perm);
          return `${hasPerm ? icon('Success') : icon('Error')} ${perm}`;
        })
        .join('\n');

      const header = `${icon('Roles')} **${role.name}** ${pill(role.id)}\n\n${iconPill('Insights', t(language, 'commands.role.overview'))}\n${t(language, 'commands.role.hoist')} ${smallPill(role.hoist ? t(language, 'generic.yes') : t(language, 'generic.no'))}\n${t(language, 'commands.role.color')} ${smallPill(role.color)}\n${t(language, 'commands.role.mentionable')} ${smallPill(role.mentionable ? t(language, 'generic.yes') : t(language, 'generic.no'))}`;

      return {
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: header,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${cat.emoji} ${pill(key)}\n${permText}`,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'role_prev',
                    emoji: iconAsEmoji('Left'),
                    style: ButtonStyles.Secondary,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'role_next',
                    emoji: iconAsEmoji('Right'),
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      } satisfies {
        components: MessageComponents;
        flags: MessageFlags;
      };
    };

    const msg = await interaction.edit(makeContent());

    const collector = new Collector<Interaction>({ duration: 5 * 60 * 1000 }); // 5m in ms
    collectors.add(collector);

    collector.onCollect(async (i) => {
      await i.deferEdit();

      // @ts-ignore
      if (i.message.id !== msg.id) return;

      if (i.data?.customId === 'role_prev') {
        categoriesList.back();
      } else if (i.data?.customId === 'role_next') {
        categoriesList.next();
      }

      if (i.user.id !== interaction.user.id) {
        await i.edit({
          ...makeContent(),
          flags: MessageFlags.Ephemeral,
        });
      }

      await i.edit(makeContent());
    });
  },
});
