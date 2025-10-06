import type { Events } from 'types/types';
import { bot } from 'bot/bot';

export default function createEvent<const TEvent extends keyof Events>(event: Event<TEvent>): void {
  bot.events[event.name] = event.run as Events[TEvent];
}

export type Event<TEvent extends keyof Events> = {
  name: TEvent;
  run: (...args: Parameters<Events[TEvent]>) => any;
};
