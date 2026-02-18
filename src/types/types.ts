import type {
  ApplicationCommandOptionTypes,
  Camelize,
  CreateApplicationCommand,
  DiscordApplicationCommandOption,
  Bot as DiscordenoBot,
  ParsedInteractionOption,
  PermissionStrings,
} from 'discordeno';
import type { bot, CustomBot } from 'bot/bot';
import EventListener from 'libs/listener';
import type { createCollector } from 'helpers/collector';

// ========== ENUMS ==========

export enum ApplicationCommandCategory {
  Core = 'Core',
  Forge = 'Forge',
  Dev = 'Dev',
}

export enum TimestampStyle {
  ShortTime = 't',
  MediumTime = 'T',
  ShortDate = 'd',
  LongDate = 'D',
  LongDateShortTime = 'f',
  FullDateShortTime = 'F',
  ShortDateShortTime = 's',
  ShortDateMediumTime = 'S',
  RelativeTime = 'R',
}

export enum SchemaType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'array',
  Object = 'object',
}

export enum ItemType {
  FILE = 0,
  DIRECTORY = 1,
  SYMLINK = 2,
  UNKNOWN = 3,
}

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum ResponseType {
  TEXT = 'TEXT',
  JSON = 'JSON',
  BUFFER = 'BUFFER',
}

// ========== INTERFACES ==========

export interface Stack {
  reject(res?: unknown): any;
  resolve(val: unknown): any;
  callback: () => any;
}

export interface Details {
  category: ApplicationCommandCategory;
  summary?: string;
  usage?: string;
  examples?: string[];
  cooldown?: number;
}

export interface CommandPermission {
  author: PermissionStrings[];
  client: PermissionStrings[];
}

export interface Precondition {
  run(context: any): boolean | Promise<boolean>;
  fail(context: any): void;
}

export interface CollectorOptions<T> {
  key: string;
  filter?: (item: T) => boolean | Promise<boolean>;
  duration?: number;
  max?: number;
}

export interface CollectorEvents<T> {
  collect: [T];
  dispose: [string];
}

export interface CollectorData<T> {
  id: string;
  key: string;
  max?: number;
  filter?: (item: T) => boolean | Promise<boolean>;
  listener: EventListener<CollectorEvents<T>>;
}

export interface ApplicationCommand<
  T extends ApplicationCommandOptions = ApplicationCommandOptions,
> extends CreateApplicationCommand {
  details: Details;
  preconditions?: Precondition;
  permissions?: CommandPermission;
  options?: T;
  acknowledge?: boolean;
  ephemeral?: boolean;
  dev?: boolean;
  run: (bot: CustomBot, interaction: Interaction, options: GetApplicationCommandOptions<T>) => any;
  autocomplete?: (bot: CustomBot, interaction: Interaction, options: GetApplicationCommandOptions<T>) => any;
}

export interface InteractionResolvedUser {
  user: User;
  member: InteractionResolvedMember;
}

export interface TypeToResolvedMap {
  [ApplicationCommandOptionTypes.String]: string;
  [ApplicationCommandOptionTypes.Integer]: number;
  [ApplicationCommandOptionTypes.Boolean]: boolean;
  [ApplicationCommandOptionTypes.User]: InteractionResolvedUser;
  [ApplicationCommandOptionTypes.Channel]: Channel;
  [ApplicationCommandOptionTypes.Role]: Role;
  [ApplicationCommandOptionTypes.Mentionable]: Role | InteractionResolvedUser;
  [ApplicationCommandOptionTypes.Number]: number;
  [ApplicationCommandOptionTypes.Attachment]: Attachment;
}

export interface Event<T extends keyof Events> {
  name: T;
  run: (...args: Parameters<Events[T]>) => any;
}

// ========== TYPES ==========

export type RequestResponse = {
  [ResponseType.TEXT]: string;
  [ResponseType.JSON]: { [key: string]: any };
  [ResponseType.BUFFER]: Buffer;
};

export type RequestOptions<T extends ResponseType> = {
  body?: any;
  method?: RequestMethod;
  response?: T;
  params?: { [key: string]: any };
  headers?: { [key: string]: any };
  timeout?: number;
};

export type ApplicationCommandOption = Camelize<DiscordApplicationCommandOption>;
export type ApplicationCommandOptions = ApplicationCommandOption[];

export type InteractionResolvedMember = Omit<Member, 'user' | 'deaf' | 'mute'>;

export type Optional<T extends Record<any, any>, K extends keyof T> = Omit<T, K> & DeepPartial<Pick<T, K>>;

export type NotOptional<T extends Record<any, any>, K extends keyof T> = Omit<DeepPartial<T>, K> & Pick<T, K>;

export type DeepPartial<T extends Record<any, any>> = {
  [K in keyof T]?: T[K] extends Object ? DeepPartial<T[K]> : T[K];
};

export type ExtractDesiredProps<T> = T extends DiscordenoBot<infer Props, infer _Behavior> ? Props : never;
export type ExtractDesiredBehavior<T> = T extends DiscordenoBot<infer _Props, infer Behavior> ? Behavior : never;

export type Events = Required<typeof bot.events>;
export type User = typeof bot.transformers.$inferredTypes.user;
export type Member = typeof bot.transformers.$inferredTypes.member;
export type Channel = typeof bot.transformers.$inferredTypes.channel;
export type Role = typeof bot.transformers.$inferredTypes.role;
export type Attachment = typeof bot.transformers.$inferredTypes.attachment;
export type Interaction = typeof bot.transformers.$inferredTypes.interaction;
export type Message = typeof bot.transformers.$inferredTypes.message;
export type Guild = typeof bot.transformers.$inferredTypes.guild;

export type CollectorType<T> = ReturnType<typeof createCollector<T>>;

export type ResolvedValues = ParsedInteractionOption<
  ExtractDesiredProps<CustomBot>,
  ExtractDesiredBehavior<CustomBot>
>[string];

export type ConvertTypeToResolved<T extends ApplicationCommandOptionTypes> = T extends keyof TypeToResolvedMap
  ? TypeToResolvedMap[T]
  : ResolvedValues;

export type SubCommandApplicationCommand =
  | ApplicationCommandOptionTypes.SubCommand
  | ApplicationCommandOptionTypes.SubCommandGroup;

export type GetOptionName<T> = T extends { name: string } ? T['name'] : never;

export type GetOptionValue<T> = T extends {
  type: ApplicationCommandOptionTypes;
  required?: boolean;
}
  ? T extends {
      type: SubCommandApplicationCommand;
      options?: ApplicationCommandOptions;
    }
    ? BuildOptions<T['options']>
    : ConvertTypeToResolved<T['type']> | (T['required'] extends true ? never : undefined)
  : never;

export type BuildOptions<T extends ApplicationCommandOptions | undefined> = {
  [Prop in keyof Omit<T, keyof unknown[]> as GetOptionName<T[Prop]>]: GetOptionValue<T[Prop]>;
};

export type GetApplicationCommandOptions<T extends ApplicationCommandOptions> = T extends ApplicationCommandOptions
  ? { [Prop in keyof BuildOptions<T> as Prop]: BuildOptions<T>[Prop] }
  : never;
