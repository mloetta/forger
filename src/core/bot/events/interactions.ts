import { Collection, commandOptionsParser, createLogger, InteractionTypes, MessageFlags } from 'discordeno';
import type { ApplicationCommand } from 'helpers/command';
import { RateLimitManager } from 'middlewares/rateLimit';
import { highlight, icon, link, smallPill, timestamp, TimestampStyle } from 'utils/markdown';
import { Collector } from 'helpers/collector';
import { RateLimitType, type ExtraProperties, type Interaction } from 'types/types';
import createEvent from 'helpers/event';
import { bot } from 'bot/bot';
import { PermissionManager } from 'middlewares/permission';
import { getXataClient } from 'utils/xata';
import { t } from 'utils/i18n';
import { SUPPORT_SERVER } from 'core/constants';
import { redis } from 'utils/redis';

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

  if (command.dev && interaction.user.id !== BigInt('782946852278501407')) return;

  const incognito = Boolean(interaction.data.options?.find((option) => option.name === 'incognito')?.value);

  let acknowledged = false;
  if (command.acknowledge) {
    await interaction.defer(command.ephemeral || incognito);

    acknowledged = true;
  }

  const rateLimits = new Collection<bigint, RateLimitManager>();

  let rateLimitManager: RateLimitManager | undefined;
  if (command.rateLimit) {
    switch (command.rateLimit.type) {
      case RateLimitType.Channel: {
        rateLimitManager = new RateLimitManager(rateLimits, interaction.channel.id!);
        break;
      }
      case RateLimitType.Guild: {
        rateLimitManager = new RateLimitManager(rateLimits, interaction.guild.id);
        break;
      }
      case RateLimitType.User: {
        rateLimitManager = new RateLimitManager(rateLimits, interaction.user.id);
        break;
      }
    }

    const { limited, duration } = rateLimitManager.check();

    if (limited) {
      switch (command.rateLimit.type) {
        case RateLimitType.Channel: {
          if (acknowledged) {
            await interaction.edit({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.channelRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, TimestampStyle.RelativeTime) })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.channelRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, TimestampStyle.RelativeTime) })}`,
              flags: MessageFlags.Ephemeral,
            });
          }
          break;
        }
        case RateLimitType.Guild: {
          if (acknowledged) {
            await interaction.edit({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.guildRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, TimestampStyle.RelativeTime) })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.guildRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, TimestampStyle.RelativeTime) })}`,
              flags: MessageFlags.Ephemeral,
            });
          }
          break;
        }
        case RateLimitType.User: {
          if (acknowledged) {
            await interaction.edit({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.userRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, TimestampStyle.RelativeTime) })}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.respond({
              content: `${icon('Warning')} ${t(language, 'events.interactionCreate.userRateLimited', { limit: command.rateLimit.limit, command: smallPill(command.name), time: timestamp(duration, TimestampStyle.RelativeTime) })}`,
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
    if (!interaction.guildId) return;
    const cachedGuild = await bot.cache.guilds.get(interaction.guildId);
    if (!cachedGuild) return;

    if (!interaction.channelId) return;
    const cachedChannel = await bot.cache.channels.get(interaction.channelId);
    if (!cachedChannel) return;

    const client = await bot.cache.members.get(bot.id, interaction.guild.id);
    if (!client) return;

    if (!interaction.member) return;
    const author = await bot.cache.members.get(interaction.member.id, interaction.guild.id);
    if (!author) return;

    const permissionManager = new PermissionManager(cachedGuild, cachedChannel, author, client, command.permissions);

    const { authorHasPerm, clientHasPerm, missingAuthorPerms, missingClientPerms } = permissionManager.check();

    if (!authorHasPerm) {
      if (acknowledged) {
        await interaction.edit({
          content: `${icon('Warning')} ${t(language, 'events.interactionCreate.missingAuthorPerms', { perms: highlight(missingAuthorPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Warning')} ${t(language, 'events.interactionCreate.missingAuthorPerms', { perms: highlight(missingAuthorPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return;
    }

    if (!clientHasPerm) {
      if (acknowledged) {
        await interaction.edit({
          content: `${icon('Warning')} ${t(language, 'events.interactionCreate.missingBotPerms', { perm: highlight(missingClientPerms.join(', ')) })}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Warning')} ${t(language, 'events.interactionCreate.missingBotPerms', { perm: highlight(missingClientPerms.join(', ')) })}`,
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
      redis,
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
    redis,
  } satisfies ExtraProperties;

  await command.autocomplete(bot, interaction, commandOptionsParser(interaction), extras);
}
