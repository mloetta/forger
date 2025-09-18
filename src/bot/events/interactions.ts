import { commandOptionsParser, InteractionTypes } from "discordeno";
import { bot } from "../bot";
import { Collector } from "../../helpers/collector";

export const collectors = new Set<Collector>();

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
      
      await command.run(interaction, commandOptionsParser(interaction));
    } catch (e) {
      console.error(e);
      return
    }
  }
}