import { readDirectory } from 'utils/utils';
import { updateCommands } from 'bot/bot';
import { join } from 'path';

// Import commands
await readDirectory(join(__dirname, '../bot/commands'));

await updateCommands();

// We need to manually exit as the REST Manager has timeouts that will keep Bun alive
process.exit();
