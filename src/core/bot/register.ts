import { createRestManager } from 'discordeno';
import { localize, readDirectory } from 'utils/utils';
import { join } from 'path/posix';
import { TOKEN } from 'utils/variables';

const rest = createRestManager({ token: TOKEN });

console.log('Refreshing application (/) commands');

const modules = await readDirectory(join(__dirname, './commands'));

const commands = modules.map((module) => {
  const command = module.default;
  return localize(command);
});

await rest.upsertGlobalApplicationCommands(commands);

console.log('Successfully reloaded application (/) commands');

process.exit();
