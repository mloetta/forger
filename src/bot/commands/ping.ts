import type { ChatInput } from "../../helpers/chatInput";

export const command = {
  name: "ping",
  description: "Replies with Pong!",
  details: {
    category: "core",
  },
  acknowledge: true,
  async run(interaction, args) {
    await interaction.respond('Pong!')
  },
} satisfies ChatInput;