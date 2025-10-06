import type { Bot as DiscordenoBot, Collection, Locales, PermissionStrings } from 'discordeno';
import type { bot } from 'bot/bot';
import type { RateLimitManager } from 'utils/rateLimit';
import type { Localization } from 'discordeno';

// Type helpers
export type Optional<T extends Record<any, any>, K extends keyof T> = Omit<T, K> & DeepPartial<Pick<T, K>>;

export type NotOptional<T extends Record<any, any>, K extends keyof T> = Omit<DeepPartial<T>, K> & Pick<T, K>;

export type DeepPartial<T extends Record<any, any>> = {
  [K in keyof T]?: T[K] extends Object ? DeepPartial<T[K]> : T[K];
};

// Discordeno type helpers
export type ExtractDesiredProps<T> = T extends DiscordenoBot<infer Props, infer _Behavior> ? Props : never;
export type ExtractDesiredBehavior<T> = T extends DiscordenoBot<infer _Props, infer Behavior> ? Behavior : never;

// Discordeno inferred types
export type Bot = typeof bot;
export type Events = Required<typeof bot.events>;
export type User = typeof bot.transformers.$inferredTypes.user;
export type Member = typeof bot.transformers.$inferredTypes.member;
export type Channel = typeof bot.transformers.$inferredTypes.channel;
export type Role = typeof bot.transformers.$inferredTypes.role;
export type Attachment = typeof bot.transformers.$inferredTypes.attachment;
export type Interaction = typeof bot.transformers.$inferredTypes.interaction;

// Custom types
export type CommandCategory = 'Core' | 'Info' | 'Moderation' | 'Utility' | 'Web' | 'Dev';

export interface Details {
  category: CommandCategory;
  summary?: string;
  usage?: string;
  examples?: string[];
}

export interface RateLimit {
  type: 'Guild' | 'User';
  limit: number;
  duration: number;
}

export interface CommandPermission {
  author: PermissionStrings[];
  client: PermissionStrings[];
}

export interface Precondition {
  run(context: any): boolean | Promise<boolean>;
  fail(context: any): void;
}

export type CommandLocalization = (Partial<Record<keyof Localization, string>> & { global: string }) | string;
export type RateLimitType = Collection<bigint, RateLimitManager>;
