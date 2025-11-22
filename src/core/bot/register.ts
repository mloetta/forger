import { ApplicationCommandOptionTypes, createLogger, createRestManager } from 'discordeno';
import { BOT_TOKEN } from 'core/variables';
import { bot } from './bot';
import { omit, readDirectory } from 'utils/utils';
import { join } from 'path';
import type { ApplicationCommandOption } from 'helpers/command';
import 'utils/process';

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
    'rateLimit',
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

await rest.upsertGlobalApplicationCommands(globalCommands);
await rest.upsertGuildApplicationCommands('1193589991012577300', guildCommands);

logger.info('Successfully reloaded application (/) commands');

process.exit();
