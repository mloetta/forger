import type { Events } from 'types/types';
import { bot } from 'bot/bot';

export default function createEvent<T extends keyof Events>(event: Event<T>): void {
  bot.events[event.name] = event.run as Events[T];
}

export interface Event<T extends keyof Events> {
  name: T;
  run: (...args: Parameters<Events[T]>) => any;
}
