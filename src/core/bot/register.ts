import { Collection, createRestManager } from "discordeno";
import type { ChatInput } from "../../helpers/chatInput";
import type { ContextMenu } from "../../helpers/contextMenu";
import { readDirectory } from "../../utils/utils";
import { join } from "path/posix";
import { TOKEN } from "../../utils/variables";

const rest = createRestManager({
  token: TOKEN
})

const cache = new Collection<string, ChatInput & ContextMenu>()

console.log('Refreshing application (/) commands');

const commands = await readDirectory(join(__dirname, './commands'));
for (const module of commands) {
  const command = module.command
  
  cache.set(command.name, command)
}

await rest.upsertGlobalApplicationCommands(Array.from(cache.values()))

console.log('Successfully reloaded application (/) commands');

process.exit();