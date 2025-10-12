import { DiscordApplicationIntegrationType, DiscordInteractionContextType, snowflakeToTimestamp } from 'discordeno';
import { t } from 'utils/i18n';
import { getShardInfoFromGuild } from 'bot/utils';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory } from 'types/types';

createApplicationCommand({
  name: 'ping',
  description: 'Replies with Pong!',
  descriptionLocalizations: {
    'pt-BR': 'Responde com Pong!',
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
  acknowledge: true,
  async run(bot, interaction, options) {
    // Gateway
    const shardInfo = await getShardInfoFromGuild(interaction.guild.id);
    const shard = shardInfo.shardId;
    const gatewayLatency = shardInfo.rtt === -1 ? 'N/A' : shardInfo.rtt;

    // REST
    const restLatency = Date.now() - snowflakeToTimestamp(interaction.id);

    await interaction.edit(
      t(interaction.locale!, 'commands.ping.response', {
        shard,
        gatewayLatency,
        restLatency,
      }),
    );
  },
});
