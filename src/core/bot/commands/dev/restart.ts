import { updateCommands } from 'bot/bot';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory } from 'types/types';

createApplicationCommand({
  name: 'restart',
  description: 'Restarts the bot',
  details: {
    category: ApplicationCommandCategory.Dev,
  },
  dev: true,
  acknowledge: true,
  async run(bot, interaction, options) {
    await interaction.edit('Restarting...');

    setTimeout(() => {
      process.exit();
    }, 500);
  },
});
