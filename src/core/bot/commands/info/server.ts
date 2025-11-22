import {
  ChannelTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  guildBannerUrl,
  guildIconUrl,
  MessageComponentTypes,
  SeparatorSpacingSize,
  snowflakeToTimestamp,
  type MediaGalleryComponent,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType } from 'types/types';
import { t } from 'utils/i18n';
import { codeblock, icon, iconPill, pill, smallIconPill, timestamp, TimestampStyle } from 'utils/markdown';

createApplicationCommand({
  name: 'server',
  nameLocalizations: {
    'pt-BR': 'servidor',
  },
  description: 'Get information about the server',
  descriptionLocalizations: {
    'pt-BR': 'Obtenha informações sobre o servidor',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall],
  contexts: [DiscordInteractionContextType.Guild],
  details: {
    category: ApplicationCommandCategory.Info,
  },
  rateLimit: {
    type: RateLimitType.User,
    duration: 3,
    limit: 1,
  },
  acknowledge: true,
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    const guild = interaction.guild;

    // A bunch of guild info we can show
    const guildOwnerId = guild.ownerId;
    const guildCreatedAt = snowflakeToTimestamp(guild.id);
    const guildLocale = guild.preferredLocale;
    const guildIcon = guild.icon ? guildIconUrl(guild.id, guild.icon) : null;
    const guildBanner = guild.banner
      ? guildBannerUrl(guild.id, {
          banner: guild.banner,
        })
      : null;
    const members = guild.members.size;
    const emojis = guild.emojis.size;
    const stickers = guild.stickers?.size ?? 0;
    const expressions = emojis + stickers;
    const boosts = guild.premiumSubscriptionCount;
    const roles = guild.roles.size;
    const channels = guild.channels.size;
    const categories = guild.channels.filter((channel) => channel.type === ChannelTypes.GuildCategory).size;
    const textChannels = guild.channels.filter((channel) => channel.type === ChannelTypes.GuildText).size;
    const voiceChannels = guild.channels.filter((channel) => channel.type === ChannelTypes.GuildVoice).size;
    const announcementChannels = guild.channels.filter(
      (channel) => channel.type === ChannelTypes.GuildAnnouncement,
    ).size;
    const stageChannels = guild.channels.filter((channel) => channel.type === ChannelTypes.GuildStageVoice).size;
    const forumChannels = guild.channels.filter((channel) => channel.type === ChannelTypes.GuildForum).size;

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            guildIcon
              ? {
                  type: MessageComponentTypes.Section,
                  components: [
                    {
                      type: MessageComponentTypes.TextDisplay,
                      content: `${icon('Core')} **${guild.name}** ${pill(`(${guild.id})`)}\n${guild.description ?? ''}`,
                    },
                  ],
                  accessory: {
                    type: MessageComponentTypes.Thumbnail,
                    media: {
                      url: guildIcon,
                    },
                  },
                }
              : {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Core')} **${guild.name}** ${pill(`(${guild.id})`)}\n${guild.description ?? ''}`,
                },
            {
              type: MessageComponentTypes.Separator,
              spacing: SeparatorSpacingSize.Large,
              divider: true,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${smallIconPill('Members', `${members} ${t(language, 'commands.server.members')}`)} ${smallIconPill('Boost', `${boosts} ${t(language, 'commands.server.boost')}`)}\n${smallIconPill('Roles', `${roles} ${t(language, 'commands.server.roles')}`)} ${smallIconPill('Emoji', `${expressions}, ${t(language, 'commands.server.expressions')}`)}\n\n${iconPill('Calendar', `${t(language, 'commands.server.createdAt')} ${timestamp(guildCreatedAt, TimestampStyle.LongDate)}`)}\n${icon('Owner')} <@${guildOwnerId}>\n${iconPill('Globe', guildLocale)}`,
            },
            {
              type: MessageComponentTypes.Separator,
              spacing: SeparatorSpacingSize.Large,
              divider: true,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${iconPill('Channel', t(language, 'commands.server.channels'))}\n${codeblock('python', `${t(language, 'commands.server.total')} ${channels}\n${t(language, 'commands.server.categories')} ${categories}\n${t(language, 'commands.server.textChannels')} ${textChannels}\n${t(language, 'commands.server.voiceChannels')} ${voiceChannels}\n${t(language, 'commands.server.announcementChannels')} ${announcementChannels}\n${t(language, 'commands.server.stageChannels')} ${stageChannels}\n${t(language, 'commands.server.forumChannels')} ${forumChannels}`)}`,
            },
            ...(guildBanner
              ? [
                  {
                    type: MessageComponentTypes.MediaGallery,
                    items: [
                      {
                        media: {
                          url: guildBanner,
                        },
                      },
                    ],
                  } satisfies MediaGalleryComponent,
                ]
              : []),
          ],
        },
      ],
    });
  },
});
