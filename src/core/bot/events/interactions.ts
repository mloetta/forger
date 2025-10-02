import {
  ApplicationCommandTypes,
  Collection,
  commandOptionsParser,
  InteractionTypes,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import { bot } from 'bot/bot';
import type { ApplicationCommand } from 'helpers/command';
import type { Event } from 'helpers/event';
import { RateLimitManager } from 'utils/rateLimit';
import { icon, smallPill, timestamp } from 'utils/markdown';
import type { Component } from 'helpers/component';

const rateLimits = new Collection<bigint, RateLimitManager>();

// TODO: add permission handler
export default {
  name: 'interactionCreate',
  async run(interaction) {
    if (!interaction.data) return;

    if (interaction.data.type === ApplicationCommandTypes.ChatInput) {
      const command = bot.commands.get(interaction.data.name) as ApplicationCommand<ApplicationCommandTypes.ChatInput>;
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
        const rateLimiter = new RateLimitManager(rateLimits, interaction.user.id);

        const { type, limit, duration } = command.rateLimit;

        const status = rateLimiter.check();

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
            const context = { interaction, options: commandOptionsParser(interaction) };

            if (!(await command.preconditions.run(context))) {
              command.preconditions.fail(context);
              return;
            }
          }

          await command.run(bot, interaction, commandOptionsParser(interaction));
        } catch (e) {
          bot.logger.error(`Command ${command.name} has errored.`, e);

          if (acknowledged) {
            await interaction.edit(`${icon('Dead')} Uh-oh, this command feels... wrong. Maybe try again later?`);
            return;
          } else {
            await interaction.respond(`${icon('Dead')} Uh-oh, this command feels... wrong. Maybe try again later?`);
            return;
          }
        }

        rateLimiter.apply(duration, limit);
        return;
      }

      try {
        if (command.preconditions) {
          const context = { interaction, options: commandOptionsParser(interaction) };

          if (!(await command.preconditions.run(context))) {
            command.preconditions.fail(context);
            return;
          }
        }

        await command.run(bot, interaction, commandOptionsParser(interaction));
      } catch (e) {
        bot.logger.error(`Command ${command.name} has errored.`, e);

        if (acknowledged) {
          await interaction.edit(`${icon('Dead')} Uh-oh, this command feels... wrong. Maybe try again later?`);
        } else {
          await interaction.respond(`${icon('Dead')} Uh-oh, this command feels... wrong. Maybe try again later?`);
        }

        return;
      }
    } else if (interaction.data.componentType === MessageComponentTypes.Button) {
      const [customId, argList] = interaction.data.customId!.split('-');
      const args = argList ? argList.split(',') : [];
      if (!customId) return;

      const button = bot.buttons.get(customId) as Component<'Button'>;
      if (!button) return;

      bot.logger.info(`Received "Button" interaction: ${button.name}`);

      if (button.acknowledge) {
        await interaction.deferEdit();
      }

      try {
        await button.run(bot, interaction, args);
      } catch (e) {
        bot.logger.error(`Button ${button.name} has errored.`, e);
        return;
      }
    } else if (
      interaction.data.componentType ===
      (MessageComponentTypes.RoleSelect |
        MessageComponentTypes.UserSelect |
        MessageComponentTypes.StringSelect |
        MessageComponentTypes.ChannelSelect |
        MessageComponentTypes.MentionableSelect)
    ) {
      const [customId, argList] = interaction.data.customId!.split('-');
      const args = argList ? argList.split(',') : [];
      if (!customId) return;

      const selectMenu = bot.selectMenus.get(customId) as Component<'SelectMenu'>;
      if (!selectMenu) return;

      bot.logger.info(`Received "SelectMenu" interaction: ${selectMenu.name}`);

      if (selectMenu.acknowledge) {
        await interaction.deferEdit();
      }

      try {
        await selectMenu.run(bot, interaction, args);
      } catch (e) {
        bot.logger.error(`Select Menu ${selectMenu.name} has errored.`, e);
        return;
      }
    } else if (interaction.type === InteractionTypes.ModalSubmit) {
      const [customId, argList] = interaction.data.customId!.split('-');
      const args = argList ? argList.split(',') : [];
      if (!customId) return;

      const modal = bot.modals.get(customId) as Component<'Modal'>;
      if (!modal) return;

      bot.logger.info(`Received "Modal" interaction: ${modal.name}`);

      try {
        await modal.run(bot, interaction, args);
      } catch (e) {
        bot.logger.error(`Modal ${modal.name} has errored.`, e);
        return;
      }
    }
  },
} satisfies Event<'interactionCreate'>;
