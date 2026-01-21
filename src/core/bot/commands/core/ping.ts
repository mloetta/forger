import { DiscordApplicationIntegrationType, DiscordInteractionContextType, snowflakeToTimestamp } from 'discordeno';
import { getShardInfoFromGuild } from 'bot/bot';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory } from 'types/types';
import { icon } from 'utils/markdown';

createApplicationCommand({
  name: 'ping',
  description: 'Replies with Pong!',
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Core,
    cooldown: 5,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    // Gateway
    const shardInfo = await getShardInfoFromGuild(interaction.guild?.id);
    const shard = shardInfo.shardId;
    const gatewayLatency = shardInfo.rtt === -1 ? 'N/A' : shardInfo.rtt;

    // REST
    const restLatency = Date.now() - snowflakeToTimestamp(interaction.id);

    await interaction.edit(
      `${icon('NeutralPing')} Pong!\n-# Gateway (Shard: #${shard}): **${gatewayLatency}ms** ・ REST: **${restLatency}ms**`,
    );
  },
});
