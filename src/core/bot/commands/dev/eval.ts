import { collectors } from 'bot/events/interactions';
import { TOKEN } from 'core/variables';
import {
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  InteractionTypes,
  MessageComponentTypes,
  TextStyles,
} from 'discordeno';
import { Collector } from 'helpers/collector';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, type Interaction } from 'types/types';
import * as util from 'util';

createApplicationCommand({
  name: 'eval',
  description: 'Executes given code',
  descriptionLocalizations: {
    'pt-BR': 'Executa o código fornecido',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall],
  contexts: [DiscordInteractionContextType.Guild],
  details: {
    category: ApplicationCommandCategory.Dev,
  },
  dev: true,
  async run(bot, interaction, options, extras) {
    await interaction.respond({
      title: 'Eval',
      customId: 'eval_modal',
      components: [
        {
          type: MessageComponentTypes.TextDisplay,
          content: 'Write down the code that you want to execute',
        },
        {
          type: MessageComponentTypes.Label,
          label: 'The code that you want to execute goes here',
          component: {
            type: MessageComponentTypes.TextInput,
            customId: 'eval_code_input',
            placeholder: 'Enter your code here',
            style: TextStyles.Paragraph,
            required: true,
          },
        },
      ],
    });

    const collector = new Collector<Interaction>({
      filter: (i) => i.type === InteractionTypes.ModalSubmit && i.data?.customId === 'eval_modal',
    });
    collectors.add(collector);

    collector.onCollect(async (i) => {
      if (!i.data) return;

      const code = i.data.components?.[1]?.component?.value;
      if (!code) return;

      let result;
      try {
        result = eval(code);
      } catch (e) {
        result = e;
      }

      const response = ['```ts'];
      const regex = new RegExp(TOKEN, 'gi');

      if (result && typeof result.then === 'function') {
        let value;
        try {
          value = await result;
        } catch (e) {
          value = e;
        }

        response.push(util.inspect(value, { depth: 1 }).replace(regex, 'TOKEN').substring(0, 1985));
      } else {
        response.push(String(util.inspect(result)).replace(regex, 'TOKEN').substring(0, 1985));
      }

      response.push('```');

      await i.respond(response.join('\n'));
    });
  },
});
