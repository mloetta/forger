import type { Command } from "../../../helpers/command";

export const command = {
  name: "ping",
  description: "Replies with Pong!",
  details: {
    category: "core",
  },
  acknowledge: true,
  async run(interaction, options) {
    await interaction.respond('Pong!')
  },
} satisfies Command;