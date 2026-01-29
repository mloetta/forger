import { bot } from 'bot/bot';
import type { ApplicationCommand, ApplicationCommandOptions } from 'types/types';

export default function createApplicationCommand<const T extends ApplicationCommandOptions>(
  command: ApplicationCommand<T>,
): void {
  bot.commands.set(command.name, command as ApplicationCommand);
}
