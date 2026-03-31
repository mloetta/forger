import { getShardInfoFromGuild } from 'core/bot/bot';
import { Emoji } from 'core/emojis';
import {
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, TimestampStyle } from 'types/types';
import { icon, timestamp } from 'utils/markdown';
import os from 'os';
import { MAINTENANCE } from 'core/variables';

createApplicationCommand({
  name: 'debug',
  description: 'View some statistics of the bot',
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Core,
    cooldown: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    // Shard information
    const shardInfo = await getShardInfoFromGuild(interaction.guildId);
    const shard = shardInfo.shardId;
    const latency = shardInfo.rtt === -1 ? 'N/A' : `${shardInfo.rtt.toLocaleString('en-US')}ms`;

    // System information
    const uptime = timestamp(Math.floor(Date.now() - process.uptime() * 1000), TimestampStyle.RelativeTime);
    const memory = process.memoryUsage();
    const usedMemory = memory.rss;
    const totalMemory = os.totalmem();
    const memoryUsage = `${Number((usedMemory / 1024 / 1024).toFixed(2)).toLocaleString('en-US')} MB (${Number((totalMemory / 1024 / 1024).toFixed(2)).toLocaleString('en-US')} MB)`;

    // Bot information
    const app = await bot.rest.getApplicationInfo();
    const guilds = app.approximateGuildCount?.toLocaleString('en-US') ?? 'N/A';
    const installs = app.approximateUserInstallCount?.toLocaleString('en-US') ?? 'N/A';

    const maintenance =
      MAINTENANCE.toLowerCase() === 'true' ? `\n-# ${icon(Emoji.Warning)} The bot is currently under maintenance.` : '';

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Shard #${shard}${maintenance}\n### Overall\n${icon(Emoji.Text3)} Latency: **${latency}**\n${icon(Emoji.Text2)} Uptime: **${uptime}**\n${icon(Emoji.Text1)} Memory: **${memoryUsage}**`,
            },
            {
              type: MessageComponentTypes.Separator,
              divider: false,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `### Bot\n${icon(Emoji.Text3)} Guilds: **${guilds}**\n${icon(Emoji.Text1)} Installs: **${installs}**`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
