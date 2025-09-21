import { ApplicationCommandTypes, commandOptionsParser, InteractionTypes } from "discordeno";
import { bot } from "bot/bot";
import { Collector } from "helpers/collector";
import type { Interaction } from "types/types";
import { getXataClient } from "utils/xata";
import type { ApplicationCommand } from "helpers/command";

export const collectors = new Set<Collector<Interaction>>();
const xata = getXataClient()

// TODO: add permission handler
export const interactionCreate: typeof bot.events.interactionCreate = async (interaction) => {
  for (const collector of collectors) {
    collector.collect(interaction);
  }
  
  if (interaction.type === InteractionTypes.ApplicationCommand) {
    if (!interaction.data) return;

    const command = bot.commands.get(interaction.data.name);
    if (!command) return;

    const incognito = interaction.data.options?.find((option) => option.name === "incognito")?.value as boolean;

    if (command.acknowledge ?? true) {
      await interaction.defer(!!command.ephemeral || incognito)
    }

    try {
      if (command.preconditions) {
        const context = { interaction, args: commandOptionsParser(interaction) };

        if (!(await command.preconditions.run(context))) {
          command.preconditions.fail(context);
          return;
        }
      }
      
      if (interaction.data.type === ApplicationCommandTypes.ChatInput) {
        await (command as ApplicationCommand<ApplicationCommandTypes.ChatInput>).run(interaction, commandOptionsParser(interaction), xata);
      } else if (interaction.data.type === ApplicationCommandTypes.Message || interaction.data.type === ApplicationCommandTypes.User) {
        await (command as ApplicationCommand<ApplicationCommandTypes.Message | ApplicationCommandTypes.User>).run(interaction, xata);
      }
    } catch (e) {
      console.error(e);
      return
    }
  }
}