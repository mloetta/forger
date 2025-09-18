import type { PermissionStrings } from "discordeno";
import type { bot } from "../bot/bot";

export type Interaction = typeof bot.transformers.$inferredTypes.interaction

export type CommandCategory = 'core' | 'info' | 'moderation' | 'utility' | 'web' | 'dev';

export interface Details {
  category: CommandCategory;
  summary?: string;
  usage?: string;
  examples?: string[];
}

export interface Precondition {
  run(context: any): boolean | Promise<boolean>;
  fail(context: any): void;
}

export interface CommandPermission {
  author: PermissionStrings[];
  client: PermissionStrings[];
}
