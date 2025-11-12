import { DiscordApplicationIntegrationType, DiscordInteractionContextType, snowflakeToTimestamp } from 'discordeno';
import { t } from 'utils/i18n';
import { getShardInfoFromGuild } from 'bot/bot';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, ApplicationCommandScope, RateLimitType } from 'types/types';
import { icon } from 'utils/markdown';

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
    scope: ApplicationCommandScope.Global,
  },
  rateLimit: {
    type: RateLimitType.User,
    duration: 3,
    limit: 1,
  },
  acknowledge: true,
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    // Gateway
    const shardInfo = await getShardInfoFromGuild(interaction.guild.id);
    const shard = shardInfo.shardId;
    const gatewayLatency = shardInfo.rtt === -1 ? 'N/A' : shardInfo.rtt;

    // REST
    const restLatency = Date.now() - snowflakeToTimestamp(interaction.id);

    await interaction.edit(
      `${icon('NeutralPing')} ${t(language, 'commands.ping.response', {
        shard,
        gatewayLatency,
        restLatency,
      })}`,
    );
  },
});
