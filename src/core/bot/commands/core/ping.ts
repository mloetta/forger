import { getShardInfoFromGuild } from 'bot/bot';
import { DiscordApplicationIntegrationType, DiscordInteractionContextType, snowflakeToTimestamp } from 'discordeno';
import type { ApplicationCommand } from 'helpers/command';
import { Translate } from 'utils/i18n';

export default {
  name: 'ping',
  description: {
    global: 'Replies with Pong!',
    'pt-BR': 'Responde com Pong!',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: 'Core',
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
      Translate(interaction.locale!, 'commands.ping.response', { shard, gatewayLatency, restLatency }),
    );
  },
} satisfies ApplicationCommand;
