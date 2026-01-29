import type { Channel, CommandPermission, Guild, Role } from 'types/types';
import { BitwisePermissionFlags, ChannelTypes, type PermissionStrings, separateOverwrites } from 'discordeno';
import type { Member } from 'types/types';

export class PermissionManager {
  #guild: Guild;
  #channel: Channel;
  #author: Member;
  #client: Member;
  #commandPerms: CommandPermission;

  constructor(guild: Guild, channel: Channel, author: Member, client: Member, commandPerms: CommandPermission) {
    this.#guild = guild;
    this.#channel = channel;
    this.#author = author;
    this.#client = client;
    this.#commandPerms = commandPerms;
  }

  public check() {
    const authorCommandPerms: PermissionStrings[] = this.#commandPerms.author ?? [];
    const clientCommandPerms: PermissionStrings[] = this.#commandPerms.client ?? [];

    // Author scope
    const authorGuildBits = calculateBasePermissions(this.#guild, this.#author);
    const authorChannelBits = calculateCachedChannelOverwrites(this.#guild, this.#channel.id, this.#author);
    const authorBits = authorGuildBits | authorChannelBits;
    const authorPerms = calculatePermissions(authorBits);
    const missingAuthorPerms = [
      ...getMissingGuildPermissions(this.#guild, this.#author, authorCommandPerms),
      ...getMissingChannelPermissions(this.#guild, this.#channel.id, this.#author, authorCommandPerms),
    ];

    // Client scope
    const clientGuildBits = calculateBasePermissions(this.#guild, this.#client);
    const clientChannelBits = calculateCachedChannelOverwrites(this.#guild, this.#channel.id, this.#client);
    const clientBits = clientGuildBits | clientChannelBits;
    const clientPerms = calculatePermissions(clientBits);
    const missingClientPerms = [
      ...getMissingGuildPermissions(this.#guild, this.#client, clientCommandPerms),
      ...getMissingChannelPermissions(this.#guild, this.#channel.id, this.#client, clientCommandPerms),
    ];

    return {
      authorHasPerm: missingAuthorPerms.length === 0,
      clientHasPerm: missingClientPerms.length === 0,
      authorPerms,
      clientPerms,
      missingAuthorPerms,
      missingClientPerms,
    };
  }
}

/** Calculates the permissions this member has in the given guild */
export function calculateBasePermissions(guild: Guild, member: Member) {
  if (!guild || !member) return 0n;

  let permissions = 0n;
  // Calculate the role permissions bits, @everyone role is not in memberRoleIds so we need to pass guildId manually
  permissions |=
    [...member.roles, guild.id]
      .map((id) => guild.roles!.get(id)?.permissions)
      // Removes any edge case undefined
      .filter((perm) => perm)
      .reduce((bits, perms) => {
        bits! |= perms!.bitfield;
        return bits;
      }, 0n) || 0n;

  // If the memberId is equal to the guild ownerId he automatically has every permission so we add ADMINISTRATOR permission
  if (guild.ownerId === member.id) permissions |= 8n;
  // Return the members permission bits as a string
  return permissions;
}

/** Calculates the permissions this member has for the given CachedChannel */
export function calculateCachedChannelOverwrites(guild: Guild, channelId: bigint, member: Member) {
  let channel = guild.channels!.get(channelId);
  if (!channel) return 0n;

  const isThread = [ChannelTypes.AnnouncementThread, ChannelTypes.PrivateThread, ChannelTypes.PublicThread].includes(
    channel.type,
  );

  // If the channel is a thread, we should calculate the permissions for the parent channel instead
  if (isThread) {
    const thread = guild.channels!.get(channel.parentId!);
    if (!thread) return 0n;

    channel = thread;
  }

  // Get all the role permissions this member already has
  let permissions = calculateBasePermissions(guild, member);

  // First calculate @everyone overwrites since these have the lowest priority
  const overwriteEveryone = channel.internalOverwrites?.find((overwrite) => {
    const [_, id] = separateOverwrites(overwrite);

    return id === channel.guildId;
  });

  if (overwriteEveryone) {
    const [_type, _id, allow, deny] = separateOverwrites(overwriteEveryone);

    // First remove denied permissions since denied < allowed
    permissions &= ~deny;
    permissions |= allow;
  }

  const overwrites = channel.internalOverwrites;

  // In order to calculate the role permissions correctly we need to temporarily save the allowed and denied permissions
  let allow = 0n;
  let deny = 0n;
  const memberRoles = member.roles || [];

  // Second calculate members role overwrites since these have middle priority
  for (const overwrite of overwrites || []) {
    const [_type, id, allowBits, denyBits] = separateOverwrites(overwrite);

    if (!memberRoles.includes(id)) continue;

    deny |= denyBits;
    allow |= allowBits;
  }

  // After role overwrite calculate save allowed permissions first we remove denied permissions since "denied < allowed"
  permissions &= ~deny;
  permissions |= allow;

  // Third calculate member specific overwrites since these have the highest priority
  const overwriteCachedMember = overwrites?.find((overwrite) => {
    const [_, id] = separateOverwrites(overwrite);

    return id === member.id;
  });

  if (overwriteCachedMember) {
    const [_type, _id, allowBits, denyBits] = separateOverwrites(overwriteCachedMember);

    permissions &= ~denyBits;
    permissions |= allowBits;
  }

  // If the channel is a thread and the parent channel has SEND_MESSAGES_IN_THREADS permission, we add SEND_MESSAGES permission so we can just check for SEND_MESSAGES instead of special handling for threads
  if (isThread) {
    if (permissions & BigInt(BitwisePermissionFlags.SEND_MESSAGES_IN_THREADS))
      permissions |= BigInt(BitwisePermissionFlags.SEND_MESSAGES);
  }

  // If a member is timed out, they wont have any permission except view channel and read message history so if you check for other permissions, it'll return true even if the bot's timed out and that'll end up in missing permissions error
  if ((member.communicationDisabledUntil || 0) > Date.now()) {
    if (!(permissions & BigInt(BitwisePermissionFlags.ADMINISTRATOR)))
      permissions &= BigInt(BitwisePermissionFlags.VIEW_CHANNEL | BitwisePermissionFlags.READ_MESSAGE_HISTORY);
  }

  return permissions;
}

/** Calculates the permissions this role has for the given CachedChannel */
export function calculateCachedChannelOverwritesForRole(guild: Guild, channelId: bigint, roleId: bigint) {
  let channel = guild.channels!.get(channelId);
  if (!channel) return 0n;

  const isThread = [ChannelTypes.AnnouncementThread, ChannelTypes.PrivateThread, ChannelTypes.PublicThread].includes(
    channel.type,
  );

  // If the channel is a thread, we should calculate the permissions for the parent channel instead
  if (isThread) {
    const thread = guild.channels!.get(channel.parentId!);
    if (!thread) return 0n;

    channel = thread;
  }

  const role = guild.roles!.get(roleId);
  if (!role) return 0n;

  // Get the permissions for this role
  let permissions = role.permissions.bitfield;

  // First calculate @everyone overwrites since these have the lowest priority
  const overwriteEveryone = channel.internalOverwrites?.find((overwrite) => {
    const [_, id] = separateOverwrites(overwrite);

    return id === channel.guildId;
  });

  if (overwriteEveryone) {
    const [_type, _id, allow, deny] = separateOverwrites(overwriteEveryone);

    // First remove denied permissions since denied < allowed
    permissions &= ~deny;
    permissions |= allow;
  }

  const overwrites = channel.internalOverwrites;

  // In order to calculate the role permissions correctly we need to temporarily save the allowed and denied permissions
  let allow = 0n;
  let deny = 0n;
  const memberRoles = [roleId];

  // Second calculate members role overwrites since these have middle priority
  for (const overwrite of overwrites || []) {
    const [_type, id, allowBits, denyBits] = separateOverwrites(overwrite);

    if (!memberRoles.includes(id)) continue;

    deny |= denyBits;
    allow |= allowBits;
  }

  // After role overwrite calculate save allowed permissions first we remove denied permissions since "denied < allowed"
  permissions &= ~deny;
  permissions |= allow;

  // Third calculate member specific overwrites since these have the highest priority
  const overwriteCachedMember = overwrites?.find((overwrite) => {
    const [_, id] = separateOverwrites(overwrite);

    return id === roleId;
  });

  if (overwriteCachedMember) {
    const [_type, _id, allowBits, denyBits] = separateOverwrites(overwriteCachedMember);

    permissions &= ~denyBits;
    permissions |= allowBits;
  }

  // Finally if the channel is a thread and the parent channel has SEND_MESSAGES_IN_THREADS permission, we add SEND_MESSAGES permission so we can just check for SEND_MESSAGES instead of special handling for threads
  if (isThread) {
    if (permissions & BigInt(BitwisePermissionFlags.SEND_MESSAGES_IN_THREADS))
      permissions |= BigInt(BitwisePermissionFlags.SEND_MESSAGES);
  }

  return permissions;
}

/** Checks if the given permission bits are matching the given permissions. `ADMINISTRATOR` always returns `true` */
export function getMissingPerms(permissionBits: bigint, permissions: PermissionStrings[]) {
  if (permissionBits & 8n) return [];

  return permissions
    .map((permission) =>
      permissionBits & BigInt(BitwisePermissionFlags[permission])
        ? calculatePermissions(permissionBits)[0]
        : 'ADMINISTRATOR',
    )
    .filter((permission) => permission !== 'ADMINISTRATOR');
}

/** Checks if the given permission bits are matching the given permissions. `ADMINISTRATOR` always returns `true` */
export function validatePermissions(permissionBits: bigint, permissions: PermissionStrings[]) {
  if (permissionBits & 8n) return true;

  return permissions.every(
    (permission) =>
      // Check if permission is in permissionBits
      permissionBits & BigInt(BitwisePermissionFlags[permission]),
  );
}

/** Checks if the given member has these permissions in the given guild */
export function hasGuildPermissions(guild: Guild, member: Member, permissions: PermissionStrings[]) {
  // First we need the role permission bits this member has
  const basePermissions = calculateBasePermissions(guild, member);
  // Second use the validatePermissions function to check if the member has every permission
  return validatePermissions(basePermissions, permissions);
}

/** Checks if the bot has these permissions in the given guild */
export function botHasGuildPermissions(guild: Guild, clientMember: Member, permissions: PermissionStrings[]) {
  // Since Bot is a normal member we can use the hasRolePermissions() function
  return hasGuildPermissions(guild, clientMember, permissions);
}

/** Checks if the given member has these permissions for the given channel */
export function hasChannelPermissions(
  guild: Guild,
  channelId: bigint,
  member: Member,
  permissions: PermissionStrings[],
) {
  // First we need the overwrite bits this member has
  const channelOverwrites = calculateCachedChannelOverwrites(guild, channelId, member);
  // Second use the validatePermissions function to check if the member has every permission
  return validatePermissions(channelOverwrites, permissions);
}

/** Checks if the given role has these permissions for the given channel */
export function roleHasChannelPermissions(
  guild: Guild,
  channelId: bigint,
  roleId: bigint,
  permissions: PermissionStrings[],
) {
  // First we need the overwrite bits this role has
  const channelOverwrites = calculateCachedChannelOverwritesForRole(guild, channelId, roleId);
  // Second use the validatePermissions function to check if this role has every permission
  return validatePermissions(channelOverwrites, permissions);
}

/** Returns the permissions that are not in the given permissionBits */
export function missingPermissions<T extends PermissionStrings>(permissionBits: bigint, permissions: T[]) {
  if (permissionBits & 8n) return [];

  return permissions.filter((permission) => !(permissionBits & BigInt(BitwisePermissionFlags[permission])));
}

/** Get the missing CachedGuild permissions this member has */
export function getMissingGuildPermissions<T extends PermissionStrings>(
  guild: Guild,
  member: Member,
  permissions: T[],
) {
  // First we need the role permission bits this member has
  const permissionBits = calculateBasePermissions(guild, member);
  // Second return the members missing permissions
  return missingPermissions<T>(permissionBits, permissions);
}

/** Get the missing CachedChannel permissions this member has */
export function getMissingChannelPermissions<T extends PermissionStrings>(
  guild: Guild,
  channelId: bigint,
  member: Member,
  permissions: T[],
) {
  // First we need the role permission bits this member has
  const permissionBits = calculateCachedChannelOverwrites(guild, channelId, member);
  // Second return the members missing permissions
  return missingPermissions<T>(permissionBits, permissions);
}

/** Throws an error if this member has not all of the given permissions */
export function requireGuildPermissions(guild: Guild, member: Member, permissions: PermissionStrings[]) {
  const missing = getMissingGuildPermissions(guild, member, permissions);
  if (missing.length) {
    // If the member is missing a permission throw an Error
    throw new Error(`Missing Permissions: ${missing.join(' & ')}`);
  }
}

/** Throws an error if this member has not all of the given permissions */
export function requireChannelPermissions(
  guild: Guild,
  channelId: bigint,
  member: Member,
  permissions: PermissionStrings[],
) {
  const missing = getMissingChannelPermissions(guild, channelId, member, permissions);
  if (missing.length) {
    // If the member is missing a permission throw an Error
    throw new Error(`Missing Permissions: ${missing.join(' & ')}`);
  }
}

/** This function converts a bitwise string to permission strings */
export function calculatePermissions(permissionBits: bigint) {
  return Object.keys(BitwisePermissionFlags).filter((permission) => {
    // Since Object.keys() not only returns the permission names but also the bit values we need to return false if it is a Number
    if (Number(permission)) return false;
    // Check if permissionBits has this permission
    return permissionBits & BigInt(BitwisePermissionFlags[permission as PermissionStrings]);
  }) as PermissionStrings[];
}

/** This function converts an array of permissions into the bitwise string. */
export function calculateBits(permissions: PermissionStrings[]) {
  return permissions
    .reduce((bits, perm) => {
      bits |= BigInt(BitwisePermissionFlags[perm]);
      return bits;
    }, 0n)
    .toString();
}

/** Gets the highest role from the member in this guild */
export function highestRole(guild: Guild, member: Member) {
  // Get the roles from the member
  const memberRoles = member.roles;
  // This member has no roles so the highest one is the @everyone role
  if (!memberRoles) return guild.roles!.get(guild.id)!;

  let memberHighestRole: Role | undefined;

  for (const roleId of memberRoles) {
    const role = guild.roles!.get(roleId);
    // Rare edge case handling if undefined
    if (!role) continue;

    // If memberHighestRole is still undefined we want to assign the role,
    // else we want to check if the current role position is higher than the current memberHighestRole
    if (!memberHighestRole || memberHighestRole.position < role.position) memberHighestRole = role;
    else if (memberHighestRole.position === role.position) {
      // Rare edge case handling if the role position is the same
      if (role.id < memberHighestRole.id) {
        memberHighestRole = role;
      }
    }
  }

  // The member has at least one role so memberHighestRole must exist
  return memberHighestRole;
}

/** Checks if the first role is higher than the second role */
export function higherRolePosition(guild: Guild, roleId: bigint, otherRoleId: bigint) {
  const role = guild.roles!.get(roleId);
  const otherRole = guild.roles!.get(otherRoleId);

  if (!role || !otherRole) return false;

  // Rare edge case handling
  if (role.position === otherRole.position) return role.id < otherRole.id;

  return role.position > otherRole.position;
}

/** Checks if the member has a higher position than the given role */
export function isHigherPosition(guild: Guild, member: Member | Member, compareRoleId: bigint) {
  if (guild.ownerId === member.id) return true;

  const memberHighestRole = highestRole(guild, member);

  return higherRolePosition(guild, memberHighestRole?.id || 0n, compareRoleId);
}
