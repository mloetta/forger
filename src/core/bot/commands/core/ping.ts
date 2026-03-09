import { DiscordApplicationIntegrationType, DiscordInteractionContextType, snowflakeToTimestamp } from 'discordeno';
import { getShardInfoFromGuild } from 'bot/bot';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RequestMethod, ResponseType } from 'types/types';
import { makeRequest } from 'utils/request';

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
    cooldown: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    // Gateway
    const shardInfo = await getShardInfoFromGuild(interaction.guildId);
    const shard = shardInfo.shardId;
    const gatewayLatency = shardInfo.rtt === -1 ? 'N/A' : shardInfo.rtt.toLocaleString('en-US');

    // REST
    const restLatency = (Date.now() - snowflakeToTimestamp(interaction.id)).toLocaleString('en-US');

    // API
    const apiStart = performance.now();
    await makeRequest('http://localhost:9998/health', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
    });
    const apiLatency = Math.round(performance.now() - apiStart).toLocaleString('en-US');

    await interaction.edit(
      `Pong!\n-# Gateway (Shard: #${shard}): **${gatewayLatency}ms** ・ REST: **${restLatency}ms** ・ API: **${apiLatency}ms**`,
    );
  },
});
