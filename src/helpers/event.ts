import type { Event, Events } from 'types/types';
import { bot } from 'bot/bot';

export default function createEvent<T extends keyof Events>(event: Event<T>): void {
  bot.events[event.name] = event.run as Events[T];
}
