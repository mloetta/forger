import { bot } from 'bot/bot';
import type { Interaction } from './types';

export function isInGuild(interaction: Interaction): boolean {
  return interaction.authorizingIntegrationOwners?.[0] === interaction.guild?.id;
}

export async function isInCachedGuild(interaction: Interaction): Promise<boolean> {
  const guildId = interaction.guild?.id;
  if (!guildId) return false;

  const cachedGuild = await bot.cache.guilds.get(guildId);
  if (!cachedGuild) return false;

  return interaction.authorizingIntegrationOwners?.[0] === guildId;
}
