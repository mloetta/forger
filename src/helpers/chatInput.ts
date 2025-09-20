import { ApplicationCommandOptionTypes, type ApplicationCommandOption, type CreateSlashApplicationCommand } from "discordeno";
import type { CommandPermission, Details, Interaction, Precondition } from "../types/types";

const incognito = {
  name: "incognito",
  description: "Makes the response only visible to you",
  type: ApplicationCommandOptionTypes.Boolean,
  required: false,
} satisfies ApplicationCommandOption;

export interface ChatInput extends CreateSlashApplicationCommand {
  details: Details
  preconditions?: Precondition
  permission?: CommandPermission
  options?: (ApplicationCommandOption | typeof incognito)[]
  acknowledge?: boolean
  ephemeral?: boolean
  dev?: boolean
  run(interaction: Interaction, args: Record<string, any>): any
}
