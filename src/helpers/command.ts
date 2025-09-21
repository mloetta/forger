import type { ApplicationCommandTypes, CreateApplicationCommand } from "discordeno";
import type { CommandPermission, Details, Interaction, Precondition } from "types/types";
import type { XataClient } from "utils/xata";

export interface ApplicationCommand<Type extends ApplicationCommandTypes = ApplicationCommandTypes> extends Omit<CreateApplicationCommand, 'defaultPermission' | 'defaultMemberPermissions'> {
  details: Details
  preconditions?: Precondition
  permission?: CommandPermission
  acknowledge?: boolean
  ephemeral?: boolean
  dev?: boolean
  run: Type extends ApplicationCommandTypes.ChatInput
    ? (interaction: Interaction, options: Record<string, any>, xata: XataClient) => any
    : (interaction: Interaction, xata: XataClient) => any
}
