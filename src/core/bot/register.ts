import { createLogger, createRestManager } from 'discordeno';
import { TOKEN } from 'core/variables';
import { bot } from './bot';
import { omit, readDirectory } from 'utils/utils';
import { join } from 'path';

const rest = createRestManager({ token: TOKEN });
const logger = createLogger({ name: 'Application Commands' });

logger.info('Refreshing application (/) commands');

// Import commands
await readDirectory(join(__dirname, './commands'));

const commands = bot.commands
  .array()
  .map((cmd) =>
    omit(cmd, [
      'permissions',
      'preconditions',
      'details',
      'rateLimit',
      'acknowledge',
      'ephemeral',
      'dev',
      'run',
      'autoComplete',
    ]),
  );

await rest.upsertGlobalApplicationCommands(commands);

logger.info('Successfully reloaded application (/) commands');

process.exit();
