import { ApplicationCommandOptionTypes, createLogger, createRestManager } from 'discordeno';
import { BOT_TOKEN } from 'core/variables';
import { bot } from './bot';
import { omit, readDirectory } from 'utils/utils';
import { join } from 'path';
import 'utils/process';
import type { ApplicationCommandOption } from 'types/types';
import { redis } from 'utils/redis';

const rest = createRestManager({ token: BOT_TOKEN });
const logger = createLogger({ name: 'Application Commands' });

logger.info('Refreshing application (/) commands');

// Import commands
await readDirectory(join(__dirname, './commands'));

const commands = bot.commands.array().map((cmd) => {
  const base = omit(cmd, [
    'permissions',
    'preconditions',
    'details',
    'acknowledge',
    'ephemeral',
    'dev',
    'run',
    'autocomplete',
  ]);

  if (!base.options) base.options = [];

  const incognitoOption: ApplicationCommandOption = {
    type: ApplicationCommandOptionTypes.Boolean,
    name: 'incognito',
    description: 'Whether the response should only be visible to you',
  };

  let hasSubOrGroup = false;

  for (const option of base.options) {
    if (option.type === ApplicationCommandOptionTypes.SubCommandGroup && option.options) {
      hasSubOrGroup = true;
      for (const sub of option.options) {
        if (sub.type === ApplicationCommandOptionTypes.SubCommand) {
          if (!sub.options) sub.options = [];
          sub.options.push(incognitoOption);
        }
      }
    } else if (option.type === ApplicationCommandOptionTypes.SubCommand) {
      hasSubOrGroup = true;
      if (!option.options) option.options = [];
      option.options.push(incognitoOption);
    }
  }

  if (!hasSubOrGroup) {
    base.options.push(incognitoOption);
  }

  return { ...base, dev: !!cmd.dev };
});

const globalCommands = commands.filter((c) => c.dev === false).map((c) => omit(c, ['dev']));
const guildCommands = commands.filter((c) => c.dev === true).map((c) => omit(c, ['dev']));

const registeredGlobal = await rest.upsertGlobalApplicationCommands(globalCommands);
const registeredGuild = await rest.upsertGuildApplicationCommands('1457032144349302900', guildCommands);

// Save command IDs to Redis
const commandIds: Record<string, string> = {};
for (const cmd of registeredGlobal) {
  commandIds[cmd.name] = cmd.id;
}
for (const cmd of registeredGuild) {
  commandIds[cmd.name] = cmd.id;
}

await redis.hSet('commands:ids', commandIds);

logger.info('Successfully reloaded application (/) commands');

process.exit();
