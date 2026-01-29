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
<<<<<<< HEAD
      return { executable: false, remaining: expiration };
=======
      const remaining = Math.ceil((expiration - now) / 1000);
      return { executable: false, remaining };
>>>>>>> 07adef5b5cdf3ce41f03025153f89e738e44692f
    }
  }

  const expiration = now + cooldown * 1000;
  userCooldowns.set(commandName, expiration);
  return { executable: true, remaining: expiration };
}
