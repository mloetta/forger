import { getShardInfoFromGuild } from "bot/bot";
import { DiscordApplicationIntegrationType, DiscordInteractionContextType, snowflakeToTimestamp } from "discordeno";
import type { ApplicationCommand } from "helpers/command";
import { Translate } from "utils/i18n";

export default {
  name: "ping",
  description: "Replies with Pong!",
  descriptionLocalizations: {
    "pt-BR": "Responde com Pong!"
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [DiscordInteractionContextType.BotDm, DiscordInteractionContextType.Guild, DiscordInteractionContextType.PrivateChannel],
  details: {
    category: "core",
  },
  acknowledge: true,
  async run(interaction, options, xata) {
    // Gateway
    const shardInfo = await getShardInfoFromGuild(interaction.guildId)
    const shard = shardInfo.shardId
    const gatewayLatency = shardInfo.rtt === -1 ? 'N/A' : shardInfo.rtt

    // REST
    const restLatency = Date.now() - snowflakeToTimestamp(interaction.id)

    await interaction.edit(Translate(interaction.locale!, 'commands.ping.response', { shard, gatewayLatency, restLatency}))
  },
} satisfies ApplicationCommand;