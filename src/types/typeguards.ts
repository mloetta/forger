import type { Interaction } from './types';

export function isInGuild(interaction: Interaction): boolean {
  if (interaction.authorizingIntegrationOwners?.[0] === interaction.guild?.id) return true;
  else return false;
}
