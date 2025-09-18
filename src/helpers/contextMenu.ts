import type { CreateContextApplicationCommand } from "discordeno";
import type { CommandPermission, Details, Interaction, Precondition } from "../types/types";

export interface ContextMenu extends CreateContextApplicationCommand {
  details: Details
  preconditions?: Precondition
  permission?: CommandPermission
  acknowledge?: boolean
  ephemeral?: boolean
  dev?: boolean
  run(interaction: Interaction, args: Record<string, any>): any
}