import {
  ButtonStyles,
  commandOptionsParser,
  createLogger,
  InteractionTypes,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import { check } from 'middlewares/cooldown';
<<<<<<< HEAD
import { codeblock, highlight, icon, pill, smallPill, timestamp } from 'utils/markdown';
import { TimestampStyle, type Interaction, type CollectorType, type ApplicationCommand } from 'types/types';
=======
import { codeblock, highlight, icon, pill, smallPill, timestamp, TimestampStyle } from 'utils/markdown';
import type { Interaction, CollectorType, ApplicationCommand } from 'types/types';
>>>>>>> 07adef5b5cdf3ce41f03025153f89e738e44692f
import createEvent from 'helpers/event';
import { bot } from 'bot/bot';
import { PermissionManager } from 'middlewares/permission';
import { SUPPORT_SERVER } from 'core/constants';

export const collectors = new Set<CollectorType<Interaction>>();

const logger = createLogger({ name: 'interactionCreate' });

createEvent({
  name: 'interactionCreate',
  async run(interaction) {
    logger.info(
      `Received interactionCreate event: ${interaction.id} (${interaction.type}) from ${interaction.user.username}`,
    );

    if (!interaction.data) return;

    if (interaction.type === InteractionTypes.ApplicationCommand) {
      await handleApplicationCommand(interaction);
    } else if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
      await handleApplicationCommandAutocomplete(interaction);
    } else if ([InteractionTypes.MessageComponent, InteractionTypes.ModalSubmit].includes(interaction.type)) {
      for (const collector of collectors) {
        await collector.collect(interaction);
      }
    }
  },
});

async function handleApplicationCommand(interaction: Interaction) {
  if (!interaction.data) return;

  const command = bot.commands.get(interaction.data.name) as ApplicationCommand;
  if (!command) {
    await interaction.respond({
      content: `${icon('Warning')} The command: ${highlight(interaction.data.name)} was not found`,
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

  if (command.details.cooldown) {
    const result = check(interaction.user.id, command.name, command.details.cooldown);

    if (!result.executable) {
<<<<<<< HEAD
=======
      const expires = Date.now() + result.remaining;

>>>>>>> 07adef5b5cdf3ce41f03025153f89e738e44692f
      if (command.acknowledge) {
        await interaction.edit({
          content: `${icon('Warning')} You are on cooldown! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using ${smallPill(`/${command.name}`)} again.`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Warning')} You are on cooldown! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using ${smallPill(`/${command.name}`)} again.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return;
    }
  }

  if (command.permissions) {
    if (!interaction.guildId) return;
<<<<<<< HEAD
    const guild = await bot.helpers.getGuild(interaction.guildId);
    if (!guild) return;

    if (!interaction.channelId) return;
    const channel = await bot.helpers.getChannel(interaction.channelId);
    if (!channel) return;

    const client = await bot.helpers.getMember(interaction.guildId, bot.id);
    if (!client) return;

    if (!interaction.member) return;
    const author = await bot.helpers.getMember(interaction.guildId, interaction.member.id);
=======
    const cachedGuild = await bot.rest.getGuild(interaction.guildId);
    if (!cachedGuild) return;

    if (!interaction.channelId) return;
    const cachedChannel = await bot.rest.getChannel(interaction.channelId);
    if (!cachedChannel) return;

    const client = await bot.rest.getMember(interaction.guildId, bot.id);
    if (!client) return;

    if (!interaction.member) return;
    const author = await bot.rest.getMember(interaction.guildId, interaction.member.id);
>>>>>>> 07adef5b5cdf3ce41f03025153f89e738e44692f
    if (!author) return;

    const permissionManager = new PermissionManager(guild, channel, author, client, command.permissions);

    const { authorHasPerm, clientHasPerm, missingAuthorPerms, missingClientPerms } = permissionManager.check();

    if (!authorHasPerm) {
      if (acknowledged) {
        await interaction.edit({
          content: `${icon('Warning')} You lack the following permissions: ${missingAuthorPerms.join(', ')} required to use this command`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Warning')} You lack the following permissions: ${missingAuthorPerms.join(', ')} required to use this command`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return;
    }

    if (!clientHasPerm) {
      if (acknowledged) {
        await interaction.edit({
          content: `${icon('Warning')} I lack the following permissions: ${missingClientPerms.join(', ')} required to execute this command`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.respond({
          content: `${icon('Warning')} I lack the following permissions: ${missingClientPerms.join(', ')} required to execute this command`,
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

    await command.run(bot, interaction, commandOptionsParser(interaction));
  } catch (e) {
    logger.error(`Command ${command.name} has errored.`, e);

    if (acknowledged) {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Error')} The command: ${pill(command.name)} has encountered an error. Please try again later.`,
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: codeblock('ts', e instanceof Error ? e.message : e),
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      await interaction.respond({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Error')} The command: ${pill(command.name)} has encountered an error. Please try again later.`,
              },
              {
                type: MessageComponentTypes.Separator,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: codeblock('ts', e instanceof Error ? e.message : e),
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    return;
  }
}

async function handleApplicationCommandAutocomplete(interaction: Interaction) {
  if (!interaction.data) return;

  const command = bot.commands.get(interaction.data.name) as ApplicationCommand;
  if (!command) {
    await interaction.respond({
      content: `${icon('Warning')} The command: ${interaction.data.name} was not found`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (!command.autocomplete) return;

  await command.autocomplete(bot, interaction, commandOptionsParser(interaction));
}
