import { Collection } from 'discordeno';

const cooldowns = new Collection<bigint, Collection<string, number>>();

export function check(userId: bigint, commandName: string, cooldown: number) {
  if (cooldown <= 0) throw new Error('Cooldown must be greater than 0.');

  const now = Date.now();

  if (!cooldowns.has(userId)) {
    cooldowns.set(userId, new Collection<string, number>());
  }

  const userCooldowns = cooldowns.get(userId)!;

  if (userCooldowns.has(commandName)) {
    const expiration = userCooldowns.get(commandName)!;
    if (now < expiration) {
      const remaining = Math.ceil((expiration - now) / 1000);
      return { executable: false, remaining };
    }
  }

  userCooldowns.set(commandName, now + cooldown * 1000);
  return { executable: true, remaining: 0 };
}
