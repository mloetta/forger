import {
  Collection,
  commandOptionsParser,
  createLogger,
  InteractionTypes,
  MessageFlags,
  Permissions,
} from 'discordeno';
import type { ApplicationCommand } from 'helpers/command';
import { RateLimitManager } from 'middlewares/rateLimit';
import { highlight, icon, smallPill, timestamp } from 'utils/markdown';
import type { Collector } from 'helpers/collector';
import { RateLimitType, type ExtraProperties, type Interaction } from 'types/types';
import createEvent from 'helpers/event';
import { bot } from 'bot/bot';
import { PermissionManager } from 'middlewares/permission';
import { getXataClient } from 'utils/xata';
import { t } from 'utils/i18n';

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
      content: `${icon('Melting')} ${t(language, 'events.interactionCreate.commandNotFound')}`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  let acknowledged = false;
  if (command.acknowledge) {
    await interaction.defer(command.ephemeral);

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
              content: `${icon('Melting')} ${t(language, 'events.interactionCreate.channelRateLimited', { time: timestamp(duration, 'R'), command: smallPill(command.name) })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Melting')} ${t(language, 'events.interactionCreate.channelRateLimited', { time: timestamp(duration, 'R'), command: smallPill(command.name) })}`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        }
        case RateLimitType.Guild: {
          if (acknowledged) {
            await interaction.edit({
              content: `${icon('Melting')} ${t(language, 'events.interactionCreate.guildRateLimited', { time: timestamp(duration, 'R'), command: smallPill(command.name) })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Melting')} ${t(language, 'events.interactionCreate.guildRateLimited', { time: timestamp(duration, 'R'), command: smallPill(command.name) })}`,
              flags: MessageFlags.Ephemeral,
            });
          }

          break;
        }
        case RateLimitType.User: {
          if (acknowledged) {
            await interaction.edit({
              content: `${icon('Melting')} ${t(language, 'events.interactionCreate.userRateLimited', { time: timestamp(duration, 'R'), command: smallPill(command.name) })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Melting')} ${t(language, 'events.interactionCreate.userRateLimited', { time: timestamp(duration, 'R'), command: smallPill(command.name) })}`,
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
    const botPerms = new Permissions(botMember!.permissions!.bitfield);

    const permissionManager = new PermissionManager(interaction.member?.permissions!, botPerms, command.permissions);

    const { userHasPerm, botHasPerm, missingUserPerms, missingBotPerms } = permissionManager.check();

    if (!userHasPerm) {
      if (acknowledged) {
        await interaction.edit({
          content: `${icon('Police')} ${t(language, 'events.interactionCreate.missingAuthorPerms', { perm: highlight(missingUserPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Police')} ${t(language, 'events.interactionCreate.missingAuthorPerms', { perm: highlight(missingUserPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return;
    }

    if (!botHasPerm) {
      if (acknowledged) {
        await interaction.edit({
          content: `${icon('Police')} ${t(language, 'events.interactionCreate.missingBotPerms', { perm: highlight(missingBotPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Police')} ${t(language, 'events.interactionCreate.missingBotPerms', { perm: highlight(missingBotPerms.join(', ')) })}`,
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
      await interaction.edit(`${icon('Dead')} ${t(language, 'events.interactionCreate.commandErrored')}`);
    } else {
      await interaction.respond(`${icon('Dead')} ${t(language, 'events.interactionCreate.commandErrored')}`);
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
      content: `${icon('Melting')} ${t(language, 'events.interactionCreate.commandNotFound')}`,
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
