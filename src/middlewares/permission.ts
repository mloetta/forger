import type { Permissions } from 'discordeno';
import type { CommandPermission } from 'types/types';

export class PermissionManager {
  #userPerms: Permissions;
  #botPerms: Permissions;
  #commandPerms: CommandPermission;

  constructor(userPerms: Permissions, botPerms: Permissions, commandPerms: CommandPermission) {
    this.#userPerms = userPerms;
    this.#botPerms = botPerms;
    this.#commandPerms = commandPerms;
  }

  public check(): {
    userHasPerm: boolean;
    botHasPerm: boolean;
    missingUserPerms: string[];
    missingBotPerms: string[];
  } {
    const authorPerms = this.#commandPerms?.author ?? [];
    const clientPerms = this.#commandPerms?.client ?? [];

    const missingUserPerms = authorPerms.filter((perm) => !this.#userPerms.has(perm));
    const missingBotPerms = clientPerms.filter((perm) => !this.#botPerms.has(perm));

    return {
      userHasPerm: missingUserPerms.length === 0,
      botHasPerm: missingBotPerms.length === 0,
      missingUserPerms,
      missingBotPerms,
    };
  }
}
