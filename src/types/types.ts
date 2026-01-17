import type { Bot as DiscordenoBot, Collection, PermissionStrings } from 'discordeno';
import type { bot } from 'bot/bot';
import type { RateLimitManager } from 'middlewares/rateLimit';

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
export type Events = Required<typeof bot.events>;
export type User = typeof bot.transformers.$inferredTypes.user;
export type Member = typeof bot.transformers.$inferredTypes.member;
export type CachedMember = typeof bot.cache.$inferredTypes.member;
export type Channel = typeof bot.transformers.$inferredTypes.channel;
export type Role = typeof bot.transformers.$inferredTypes.role;
export type CachedRole = typeof bot.cache.$inferredTypes.role;
export type Attachment = typeof bot.transformers.$inferredTypes.attachment;
export type Interaction = typeof bot.transformers.$inferredTypes.interaction;
export type Message = typeof bot.transformers.$inferredTypes.message;
export type Guild = typeof bot.transformers.$inferredTypes.guild;
export type CachedGuild = typeof bot.cache.$inferredTypes.guild;
export type CachedChannel = typeof bot.cache.$inferredTypes.channel;

// Command stuff
export enum ApplicationCommandCategory {
  Core = 'Core',
  Forge = 'Forge',
}

export interface Details {
  category: ApplicationCommandCategory;
  summary?: string;
  usage?: string;
  examples?: string[];
}

export enum RateLimitType {
  Channel = 'Channel',
  Guild = 'Guild',
  User = 'User',
}

export interface RateLimit {
  type: RateLimitType;
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

// Custom types
export type RateLimitManagerType = Collection<bigint, RateLimitManager>;
