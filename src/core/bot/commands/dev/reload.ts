import { updateCommands } from 'bot/bot';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory } from 'types/types';

createApplicationCommand({
  name: 'reload',
  description: 'Reloads the application (/) commands',
  details: {
    category: ApplicationCommandCategory.Dev,
  },
  dev: true,
  acknowledge: true,
  async run(bot, interaction, options) {
    await interaction.edit('Reloading application (/) commands.');

    await updateCommands();

    await interaction.edit('Application (/) commands reloaded.');
  },
});
