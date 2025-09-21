import type { Locales, PermissionStrings } from "discordeno";
import type { bot } from "bot/bot";

export type Optional<T extends Record<any, any>, K extends keyof T> = Omit<T, K> & DeepPartial<Pick<T, K>>;

export type NotOptional<T extends Record<any, any>, K extends keyof T> = Omit<DeepPartial<T>, K> & Pick<T, K>;

export type DeepPartial<T extends Record<any, any>> = {
  [K in keyof T]?: T[K] extends Object ? DeepPartial<T[K]> : T[K];
};

export type Bot = typeof bot.transformers.$inferredTypes
export type User = typeof bot.transformers.$inferredTypes.user
export type Member = typeof bot.transformers.$inferredTypes.member
export type Channel = typeof bot.transformers.$inferredTypes.channel
export type Role = typeof bot.transformers.$inferredTypes.role
export type Attachment = typeof bot.transformers.$inferredTypes.attachment
export type Interaction = typeof bot.transformers.$inferredTypes.interaction

export type CommandLocalization = (Partial<Record<keyof Locales, string>> & { global: string }) | string

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
