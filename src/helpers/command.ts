import type { ApplicationCommandTypes, CreateApplicationCommand } from "discordeno";
import type { CommandPermission, Details, Interaction, Precondition } from "../types/types";

export interface Command<Type extends ApplicationCommandTypes = ApplicationCommandTypes> extends CreateApplicationCommand {
  details: Details
  preconditions?: Precondition
  permission?: CommandPermission
  acknowledge?: boolean
  ephemeral?: boolean
  dev?: boolean
  run: Type extends ApplicationCommandTypes.ChatInput
    ? (interaction: Interaction, options: Record<string, any>) => any
    : (interaction: Interaction) => any
}
