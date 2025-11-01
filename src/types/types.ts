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

// Case types
type CamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<CamelCase<U>>}`
  : S extends `${infer F}${infer R}`
    ? `${Lowercase<F>}${R}`
    : S;

export type Camelize<T> = T extends any[]
  ? T extends Record<any, any>[]
    ? Camelize<T[number]>[]
    : T
  : T extends Record<any, any>
    ? { [K in keyof T as CamelCase<K & string>]: Camelize<T[K]> }
    : T;

type PascalCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${Capitalize<T>}${PascalCase<Capitalize<U>>}`
  : S extends `${infer F}${infer R}`
    ? `${Capitalize<F>}${R}`
    : S;

export type Pascalize<T> = T extends any[]
  ? T extends Record<any, any>[]
    ? Pascalize<T[number]>[]
    : T
  : T extends Record<any, any>
    ? { [K in keyof T as PascalCase<K & string>]: Pascalize<T[K]> }
    : T;

export type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Lowercase<T> ? '' : '_'}${Lowercase<T>}${SnakeCase<U>}`
  : Lowercase<S>;

export type Snakelize<T> = T extends any[]
  ? T extends Record<any, any>[]
    ? Snakelize<T[number]>[]
    : T
  : T extends Record<any, any>
    ? { [K in keyof T as SnakeCase<K & string>]: Snakelize<T[K]> }
    : T;

// Discordeno inferred types
export type Events = Required<typeof bot.events>;
export type User = typeof bot.transformers.$inferredTypes.user;
export type Member = typeof bot.transformers.$inferredTypes.member;
export type Channel = typeof bot.transformers.$inferredTypes.channel;
export type Role = typeof bot.transformers.$inferredTypes.role;
export type Attachment = typeof bot.transformers.$inferredTypes.attachment;
export type Interaction = typeof bot.transformers.$inferredTypes.interaction;
export type Message = typeof bot.transformers.$inferredTypes.message;

// Command stuff
export enum ApplicationCommandCategory {
  Core = 'Core',
  Info = 'Info',
  Moderation = 'Moderation',
  Utility = 'Utility',
  Web = 'Web',
  Dev = 'Dev',
}

export enum ApplicationCommandScope {
  Global = 'Global',
  Guild = 'Guild',
}

export interface Details {
  category: ApplicationCommandCategory;
  scope: ApplicationCommandScope;
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
