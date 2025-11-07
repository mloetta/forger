import { ApplicationCommandOptionTypes, createLogger, createRestManager } from 'discordeno';
import { TOKEN } from 'core/variables';
import { bot } from './bot';
import { omit, readDirectory } from 'utils/utils';
import { join } from 'path';
import type { ApplicationCommandOption } from 'helpers/command';

const rest = createRestManager({ token: TOKEN });
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

  base.options.push({
    type: ApplicationCommandOptionTypes.Boolean,
    name: 'incognito',
    description: 'Whether the response should only be visible to you',
  } satisfies ApplicationCommandOption);

  return base;
});

await rest.upsertGlobalApplicationCommands(commands);

logger.info('Successfully reloaded application (/) commands');

process.exit();
