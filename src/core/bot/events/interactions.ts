import { ApplicationCommandTypes, Collection, commandOptionsParser, createLogger, MessageFlags } from 'discordeno';
import type { ApplicationCommand } from 'helpers/command';
import { RateLimitManager } from 'utils/rateLimit';
import { icon, smallPill, timestamp } from 'utils/markdown';
import type { Collector } from 'helpers/collector';
import { RateLimitType, type Interaction } from 'types/types';
import createEvent from 'helpers/event';

export const collectors = new Set<Collector<Interaction>>();
const rateLimits = new Collection<bigint, RateLimitManager>();
const logger = createLogger({ name: 'interactionCreate' });

// TODO: add permission handler
createEvent({
  name: 'interactionCreate',
  async run(interaction) {
    logger.info(
      `Received "interactionCreate": ${interaction.id} (${interaction.type}) from ${interaction.user.username}`,
    );

    for (const collector of collectors) {
      await collector.collect(interaction);
    }

    if (!interaction.data) return;

    if (interaction.data.type === ApplicationCommandTypes.ChatInput) {
      const command = interaction.bot.commands.get(interaction.data.name) as ApplicationCommand;
      if (!command) {
        await interaction.respond({
          content: `${icon('Melting')} Are you sure you are not mistaken? This command has never existed!`,
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      let acknowledged;
      if (command.acknowledge) {
        await interaction.defer(command.ephemeral);
        acknowledged = true;
      }

      if (command.rateLimit) {
        let rateLimitManager: RateLimitManager;
        if (command.rateLimit.type === RateLimitType.Channel) {
          rateLimitManager = new RateLimitManager(rateLimits, interaction.channel.id!);
        } else if (command.rateLimit.type === RateLimitType.Guild) {
          rateLimitManager = new RateLimitManager(rateLimits, interaction.guild.id);
        } else {
          rateLimitManager = new RateLimitManager(rateLimits, interaction.user.id);
        }

        const { type, limit, duration } = command.rateLimit;

        const status = rateLimitManager.check();

        if (status.limited) {
          if (acknowledged) {
            await interaction.edit(
              `${icon('Awake')} Whoa, slow down! You need to wait ${timestamp(
                status.duration! + Date.now(),
                'R',
              )} before using ${smallPill(command.name)} again!`,
            );
            return;
          } else {
            await interaction.respond(
              `${icon('Awake')} Whoa, slow down! You need to wait ${timestamp(
                status.duration! + Date.now(),
                'R',
              )} before using ${smallPill(command.name)} again!`,
            );
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

          await command.run(interaction.bot, interaction, commandOptionsParser(interaction));
        } catch (e) {
          logger.error(`Command ${command.name} has errored.`, e);

          if (acknowledged) {
            await interaction.edit(`${icon('Dead')} Uh-oh, this command feels... wrong. Maybe try again later?`);
            return;
          } else {
            await interaction.respond(`${icon('Dead')} Uh-oh, this command feels... wrong. Maybe try again later?`);
            return;
          }
        }

        rateLimitManager.apply(duration, limit);
        return;
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

        await command.run(interaction.bot, interaction, commandOptionsParser(interaction));
      } catch (e) {
        logger.error(`Command ${command.name} has errored.`, e);

        if (acknowledged) {
          await interaction.edit(`${icon('Dead')} Uh-oh, this command feels... wrong. Maybe try again later?`);
        } else {
          await interaction.respond(`${icon('Dead')} Uh-oh, this command feels... wrong. Maybe try again later?`);
        }

        return;
      }
    }
  },
});
