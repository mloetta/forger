import { bot, type CustomBot } from 'bot/bot';
import {
  type ApplicationCommandOptionTypes,
  type CreateApplicationCommand,
  type DiscordApplicationCommandOption,
  type ParsedInteractionOption,
} from 'discordeno';
import type {
  Attachment,
  Camelize,
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

export interface ApplicationCommand<TOptions extends ApplicationCommandOptions = ApplicationCommandOptions>
  extends CreateApplicationCommand {
  details: Details;
  preconditions?: Precondition;
  rateLimit?: RateLimit;
  permissions?: CommandPermission;
  options?: TOptions;
  acknowledge?: boolean;
  ephemeral?: boolean;
  dev?: boolean;
  run: (interaction: Interaction, options: GetApplicationCommandOptions<TOptions>) => any;
  autoComplete?: (interaction: Interaction, options: GetApplicationCommandOptions<TOptions>) => any;
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
