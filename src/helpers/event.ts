import type { Events } from 'types/types';

export interface Event<Type extends keyof Events> {
  name: Type;
  run: (...args: Parameters<Events[Type]>) => any;
}
