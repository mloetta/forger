import {
  ButtonStyles,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  SeparatorSpacingSize,
} from 'discordeno';
import os from 'os';
import { iconAsEmoji, iconPill } from 'utils/markdown';
import { msToReadableTime, readableFileSize } from 'utils/utils';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType } from 'types/types';
import { getShardInfoFromGuild } from 'bot/bot';
import { INVITE_LINK, SUPPORT_SERVER } from 'core/constants';

createApplicationCommand({
  name: 'stats',
  nameLocalizations: {
    'pt-BR': 'estatísticas',
  },
  description: 'View some stats',
  descriptionLocalizations: {
    'pt-BR': 'Veja algumas estatísticas',
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
    duration: 3,
    limit: 1,
  },
  acknowledge: true,
  async run(bot, interaction, options, extras) {
    const app = await bot.helpers.getApplicationInfo();
    const shardData = await getShardInfoFromGuild(interaction.guild.id);

    // A bunch of application stats we can show
    const guilds = app.approximateGuildCount;
    const installations = app.approximateUserInstallCount;
    const shards = bot.gateway.shards.size;
    const shard = shardData.shardId;
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    const uptime = process.uptime();
    const latency = shardData.rtt;

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Shard #${shard}\n${iconPill('Reply01', 'Guilds')}: ${guilds}\n${iconPill('Reply02', 'Installations')}: ${installations}\n${iconPill('Reply02', 'Shards')}: ${shards}\n${iconPill('Reply02', 'Memory Usage')}: ${readableFileSize(usedMem)}\n${iconPill('Reply02', 'Uptime')}: ${msToReadableTime(uptime * 1000)}\n${iconPill('Reply04', 'Latency')}: ${latency}ms`,
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
                  label: 'Support Server',
                  emoji: iconAsEmoji('Discord'),
                  style: ButtonStyles.Link,
                  url: SUPPORT_SERVER,
                },
                {
                  type: MessageComponentTypes.Button,
                  label: 'Add Pocket-Tool',
                  emoji: iconAsEmoji('Link'),
                  style: ButtonStyles.Link,
                  url: INVITE_LINK,
                },
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
