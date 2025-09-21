import { ApplicationCommandTypes, commandOptionsParser, InteractionTypes } from "discordeno";
import { bot } from "bot/bot";
import { Collector } from "helpers/collector";
import type { Interaction } from "types/types";
import { getXataClient } from "utils/xata";
import type { ApplicationCommand } from "helpers/command";
import type { Event } from "helpers/event";

export const collectors = new Set<Collector<Interaction>>();
const xata = getXataClient()

// TODO: add permission handler
export default {
  name: 'interactionCreate',
  async run(interaction) {
    for (const collector of collectors) {
      collector.collect(interaction)
    }

    if (!interaction.data) return;
    
    if (interaction.data.type === ApplicationCommandTypes.ChatInput) {
      const command = bot.commands.get(interaction.data.name) as ApplicationCommand<ApplicationCommandTypes.ChatInput>
      if (!command) return;

      if (command.acknowledge) {
        await interaction.defer(command.ephemeral)
      }

      try {
        if (command.preconditions) {
          const context = { interaction, options: commandOptionsParser(interaction)}

          if (!(await command.preconditions.run(context))) {
            command.preconditions.fail(context)
            return;
          }

          await command.run(interaction, commandOptionsParser(interaction), xata)
        }
      } catch (e) {
        bot.logger.error(`Command ${command.name} has errored.`, e)

        if (command.acknowledge) {
          await interaction.edit('Uh-oh, this command feels... wrong. Maybe try again later?')
          return;
        } else {
          await interaction.respond('Uh-oh, this command feels... wrong. Maybe try again later?')
          return;
        }
      }
    }
  },
} satisfies Event<'interactionCreate'>