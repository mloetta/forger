import { bot } from 'bot/bot';
import type {
  ApplicationCommandOptionTypes,
  Camelize,
  CreateApplicationCommand,
  DiscordApplicationCommandOption,
  ParsedInteractionOption,
} from 'discordeno';
import type {
  Attachment,
  Bot,
  Channel,
  CommandPermission,
  Details,
  ExtractDesiredBehavior,
  ExtractDesiredProps,
  Interaction,
  Member,
  Precondition,
  RateLimit,
  Role,
  User,
} from 'types/types';

export default function createApplicationCommand<const TOptions extends ApplicationCommandOptions>(
  command: ApplicationCommand<TOptions>,
): void {
  bot.commands.set(command.name, command as ApplicationCommand);
}

export type ApplicationCommand<TOptions extends ApplicationCommandOptions = ApplicationCommandOptions> =
  CreateApplicationCommand & {
    details: Details;
    preconditions?: Precondition;
    permission?: CommandPermission;
    rateLimit?: RateLimit;
    options?: TOptions;
    acknowledge?: boolean;
    ephemeral?: boolean;
    dev?: boolean;
    run: (bot: Bot, interaction: Interaction, options: GetApplicationCommandOptions<TOptions>) => any;
    autoComplete?: (bot: Bot, interaction: Interaction, options: GetApplicationCommandOptions<TOptions>) => any;
  };

export type GetApplicationCommandOptions<T extends ApplicationCommandOptions> = T extends ApplicationCommandOptions
  ? { [Prop in keyof BuildOptions<T> as Prop]: BuildOptions<T>[Prop] }
  : never;

export type ApplicationCommandOption = Camelize<DiscordApplicationCommandOption>;
export type ApplicationCommandOptions = ApplicationCommandOption[];

// Option parsing logic
type ResolvedValues = ParsedInteractionOption<ExtractDesiredProps<Bot>, ExtractDesiredBehavior<Bot>>[string];

// Using omit + exclude is a slight trick to avoid a type error on Pick
export type InteractionResolvedChannel = Omit<
  Channel,
  Exclude<keyof Channel, 'id' | 'name' | 'type' | 'permissions' | 'threadMetadata' | 'parentId'>
>;
export type InteractionResolvedMember = Omit<Member, 'user' | 'deaf' | 'mute'>;
export interface InteractionResolvedUser {
  user: User;
  member: InteractionResolvedMember;
}

/**
 * From here SubCommandGroup and SubCommand are missing, this is wanted.
 *
 * The entries are sorted based on the enum value
 */
interface TypeToResolvedMap {
  [ApplicationCommandOptionTypes.String]: string;
  [ApplicationCommandOptionTypes.Integer]: number;
  [ApplicationCommandOptionTypes.Boolean]: boolean;
  [ApplicationCommandOptionTypes.User]: InteractionResolvedUser;
  [ApplicationCommandOptionTypes.Channel]: InteractionResolvedChannel;
  [ApplicationCommandOptionTypes.Role]: Role;
  [ApplicationCommandOptionTypes.Mentionable]: Role | InteractionResolvedUser;
  [ApplicationCommandOptionTypes.Number]: number;
  [ApplicationCommandOptionTypes.Attachment]: Attachment;
}

type ConvertTypeToResolved<T extends ApplicationCommandOptionTypes> = T extends keyof TypeToResolvedMap
  ? TypeToResolvedMap[T]
  : ResolvedValues;

type SubCommandApplicationCommand =
  | ApplicationCommandOptionTypes.SubCommand
  | ApplicationCommandOptionTypes.SubCommandGroup;
type GetOptionName<T> = T extends { name: string } ? T['name'] : never;
type GetOptionValue<T> = T extends { type: ApplicationCommandOptionTypes; required?: boolean }
  ? T extends { type: SubCommandApplicationCommand; options?: ApplicationCommandOptions }
    ? BuildOptions<T['options']>
    : ConvertTypeToResolved<T['type']> | (T['required'] extends true ? never : undefined)
  : never;

type BuildOptions<T extends ApplicationCommandOptions | undefined> = {
  [Prop in keyof Omit<T, keyof unknown[]> as GetOptionName<T[Prop]>]: GetOptionValue<T[Prop]>;
};
