import type {
  ApplicationCommandTypes,
  Camelize,
  CreateApplicationCommand,
  DiscordApplicationCommandOption,
  DiscordApplicationCommandOptionChoice,
} from 'discordeno';
import type {
  Bot,
  CommandLocalization,
  CommandPermission,
  Details,
  Interaction,
  Precondition,
  RateLimit,
} from 'types/types';

export interface ApplicationCommandOptionChoice
  extends Omit<DiscordApplicationCommandOptionChoice, 'name' | 'nameLocalizations'> {
  name: CommandLocalization;
}

export interface ApplicationCommandOption
  extends Omit<
    DiscordApplicationCommandOption,
    'name' | 'nameLocalizations' | 'description' | 'descriptionLocalizations' | 'choices' | 'options'
  > {
  name: CommandLocalization;
  description: CommandLocalization;
  choices?: ApplicationCommandOptionChoice[];
  options?: ApplicationCommandOption[];
}

export interface ApplicationCommand<Type extends ApplicationCommandTypes = ApplicationCommandTypes>
  extends Omit<
    CreateApplicationCommand,
    | 'name'
    | 'nameLocalizations'
    | 'description'
    | 'descriptionLocalizations'
    | 'options'
    | 'defaultPermission'
    | 'defaultMemberPermissions'
  > {
  name: CommandLocalization;
  description: CommandLocalization;
  details: Details;
  preconditions?: Precondition;
  permission?: CommandPermission;
  rateLimit?: RateLimit;
  options?: Camelize<ApplicationCommandOption[]>;
  acknowledge?: boolean;
  ephemeral?: boolean;
  dev?: boolean;
  run: Type extends ApplicationCommandTypes.ChatInput
    ? (bot: Bot, interaction: Interaction, options: Record<string, any>) => any
    : (bot: Bot, interaction: Interaction) => any;
}
