import {
  Collection,
  commandOptionsParser,
  createLogger,
  InteractionTypes,
  MessageFlags,
} from 'discordeno';
import type { ApplicationCommand } from 'helpers/command';
import { RateLimitManager } from 'middlewares/rateLimit';
import { highlight, icon, link, smallPill, timestamp } from 'utils/markdown';
import type { Collector } from 'helpers/collector';
import { RateLimitType, type ExtraProperties, type Interaction } from 'types/types';
import createEvent from 'helpers/event';
import { bot, calculatePermissions } from 'bot/bot';
import { PermissionManager } from 'middlewares/permission';
import { getXataClient } from 'utils/xata';
import { t } from 'utils/i18n';
import { SUPPORT_SERVER } from 'core/constants';

export const collectors = new Set<Collector<Interaction>>();

const logger = createLogger({ name: 'interactionCreate' });

createEvent({
  name: 'interactionCreate',
  async run(interaction) {
    logger.info(
      `Received interactionCreate event: ${interaction.id} (${interaction.type}) from ${interaction.user.username}`,
    );

    for (const collector of collectors) {
      await collector.collect(interaction);
    }

    if (!interaction.data) return;

    if (interaction.type === InteractionTypes.ApplicationCommand) {
      await handleApplicationCommand(interaction);
    } else if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
      await handleApplicationCommandAutocomplete(interaction);
    }
  },
});

async function handleApplicationCommand(interaction: Interaction) {
  if (!interaction.data) return;

  const language = interaction.locale!;

  const command = bot.commands.get(interaction.data.name) as ApplicationCommand;
  if (!command) {
    await interaction.respond({
      content: `${icon('Warning')} ${t(language, 'events.interactionCreate.commandNotFound', { command: interaction.data.name })}`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const incognito = Boolean(interaction.data.options?.find((option) => option.name === 'incognito')?.value);

  let acknowledged = false;
  if (command.acknowledge) {
    await interaction.defer(command.ephemeral || incognito);

    acknowledged = true;
  }

  const rateLimits = new Collection<bigint, RateLimitManager>();

  let rateLimitManager: RateLimitManager | undefined;
  if (command.rateLimit) {
    if (command.rateLimit.type === RateLimitType.Channel) {
      rateLimitManager = new RateLimitManager(rateLimits, interaction.channel.id!);
    } else if (command.rateLimit.type === RateLimitType.Guild) {
      rateLimitManager = new RateLimitManager(rateLimits, interaction.guild.id);
    } else {
      rateLimitManager = new RateLimitManager(rateLimits, interaction.user.id);
    }

    const { limited, duration } = rateLimitManager.check();

    if (limited) {
      switch (command.rateLimit.type) {
        case RateLimitType.Channel: {
          if (acknowledged) {
            await interaction.edit({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.channelRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, 'R') })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.channelRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, 'R') })}`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        }
        case RateLimitType.Guild: {
          if (acknowledged) {
            await interaction.edit({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.guildRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, 'R') })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.guildRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, 'R') })}`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        }
        case RateLimitType.User: {
          if (acknowledged) {
            await interaction.edit({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.userRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, 'R') })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.userRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, 'R') })}`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        }
      }

      return;
    }
  }

  if (command.permissions) {
    const botMember = await bot.cache.members.get(bot.id, interaction.guild.id);
    if (!botMember) return;

    const botRoles = botMember.roles;

    let botRolePerms;
    for (const roleId of botRoles) {
      const role = await bot.cache.roles.get(roleId);
      if (!role) continue;

      botRolePerms = role.permissions;
    }

    if (!interaction.member) return;
    const member = await bot.cache.members.get(interaction.member.id, interaction.guild.id);
    if (!member) return;

    const memberRoles = member.roles;

    let memberRolePerms;
    for (const roleId of memberRoles) {
      const role = await bot.cache.roles.get(roleId);
      if (!role) continue;

      memberRolePerms = role.permissions;
    }

    const botPerms = calculatePermissions(botMember.permissions, botRolePerms);
    const memberPerms = calculatePermissions(member.permissions, memberRolePerms);

    const permissionManager = new PermissionManager(memberPerms, botPerms, command.permissions);

    const { userHasPerm, botHasPerm, missingUserPerms, missingBotPerms } = permissionManager.check();

    if (!userHasPerm) {
      if (acknowledged) {
        await interaction.edit({
          content: `${icon('Warning')} ${t(language, 'events.interactionCreate.missingAuthorPerms', { perm: highlight(missingUserPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Warning')} ${t(language, 'events.interactionCreate.missingAuthorPerms', { perm: highlight(missingUserPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return;
    }

    if (!botHasPerm) {
      if (acknowledged) {
        await interaction.edit({
          content: `${icon('Warning')} ${t(language, 'events.interactionCreate.missingBotPerms', { perm: highlight(missingBotPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Warning')} ${t(language, 'events.interactionCreate.missingBotPerms', { perm: highlight(missingBotPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return;
    }
  }

  try {
    if (command.preconditions) {
      const context = {
        interaction,
        options: commandOptionsParser(interaction),
      };

      if (!(await command.preconditions.run(context))) {
        command.preconditions.fail(context);

        return;
      }
    }

    const xata = getXataClient();

    const extras = {
      xata,
    } satisfies ExtraProperties;

    await command.run(bot, interaction, commandOptionsParser(interaction), extras);

    if (command.rateLimit && rateLimitManager) {
      const { duration, limit } = command.rateLimit;

      rateLimitManager.apply(duration, limit);
    }
  } catch (e) {
    logger.error(`Command ${command.name} has errored.`, e);

    if (acknowledged) {
      await interaction.edit(
        `${icon('Error')} ${t(language, 'events.interactionCreate.commandErrored', { command: command.name, server: link(SUPPORT_SERVER, t(language, 'generic.supportServer')) })}`,
      );
    } else {
      await interaction.respond(
        `${icon('Error')} ${t(language, 'events.interactionCreate.commandErrored', { command: command.name, server: link(SUPPORT_SERVER, t(language, 'generic.supportServer')) })}`,
      );
    }

    return;
  }
}

async function handleApplicationCommandAutocomplete(interaction: Interaction) {
  if (!interaction.data) return;

  const language = interaction.locale!;

  const command = bot.commands.get(interaction.data.name) as ApplicationCommand;
  if (!command) {
    await interaction.respond({
      content: `${icon('Warning')} ${t(language, 'events.interactionCreate.commandNotFound', { command: interaction.data.name })}`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (!command.autocomplete) return;

  const xata = getXataClient();

  const extras = {
    xata,
  } satisfies ExtraProperties;

  await command.autocomplete(bot, interaction, commandOptionsParser(interaction), extras);
}
