import type { Bot, Interaction } from 'types/types';

export type ComponentType = 'Button' | 'SelectMenu' | 'Modal';

export interface Component<Type extends ComponentType> {
  name: string;
  type: Type;
  args?: Record<string, any>[];
  acknowledge?: Type extends 'Button' | 'SelectMenu' ? boolean : never;
  run(bot: Bot, interaction: Interaction, args: Record<string, any>): any;
}
