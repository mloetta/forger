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

<<<<<<< HEAD
=======
// Command stuff
>>>>>>> 07adef5b5cdf3ce41f03025153f89e738e44692f
export enum ApplicationCommandCategory {
  Core = 'Core',
  Forge = 'Forge',
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

export type ApplicationCommandOption = Camelize<DiscordApplicationCommandOption>;
export type ApplicationCommandOptions = ApplicationCommandOption[];

type ResolvedValues = ParsedInteractionOption<
  ExtractDesiredProps<CustomBot>,
  ExtractDesiredBehavior<CustomBot>
>[string];

export type InteractionResolvedMember = Omit<Member, 'user' | 'deaf' | 'mute'>;
export interface InteractionResolvedUser {
  user: User;
  member: InteractionResolvedMember;
}

// Map Discord types to resolved TS types
interface TypeToResolvedMap {
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

<<<<<<< HEAD
export interface Event<T extends keyof Events> {
  name: T;
  run: (...args: Parameters<Events[T]>) => any;
}

=======
>>>>>>> 07adef5b5cdf3ce41f03025153f89e738e44692f
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
export type Channel = typeof bot.transformers.$inferredTypes.channel;
export type Role = typeof bot.transformers.$inferredTypes.role;
export type Attachment = typeof bot.transformers.$inferredTypes.attachment;
export type Interaction = typeof bot.transformers.$inferredTypes.interaction;
export type Message = typeof bot.transformers.$inferredTypes.message;
export type Guild = typeof bot.transformers.$inferredTypes.guild;

export type CollectorType<T> = ReturnType<typeof createCollector<T>>;

type ConvertTypeToResolved<T extends ApplicationCommandOptionTypes> = T extends keyof TypeToResolvedMap
  ? TypeToResolvedMap[T]
  : ResolvedValues;

type SubCommandApplicationCommand =
  | ApplicationCommandOptionTypes.SubCommand
  | ApplicationCommandOptionTypes.SubCommandGroup;

type GetOptionName<T> = T extends { name: string } ? T['name'] : never;

type GetOptionValue<T> = T extends {
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

type BuildOptions<T extends ApplicationCommandOptions | undefined> = {
  [Prop in keyof Omit<T, keyof unknown[]> as GetOptionName<T[Prop]>]: GetOptionValue<T[Prop]>;
};

export type GetApplicationCommandOptions<T extends ApplicationCommandOptions> = T extends ApplicationCommandOptions
  ? { [Prop in keyof BuildOptions<T> as Prop]: BuildOptions<T>[Prop] }
  : never;
