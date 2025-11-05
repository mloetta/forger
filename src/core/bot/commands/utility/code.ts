/*
import { ApplicationCommandOptionTypes } from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, ApplicationCommandScope, RateLimitType } from 'types/types';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';

createApplicationCommand({
  name: 'code',
  nameLocalizations: {
    'pt-BR': 'código',
  },
  description: 'Execute code snippets',
  descriptionLocalizations: {
    'pt-BR': 'Execute snippets de código',
  },
  details: {
    category: ApplicationCommandCategory.Utility,
    scope: ApplicationCommandScope.Global,
  },
  rateLimit: {
    type: RateLimitType.User,
    limit: 1,
    duration: 5,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'language',
      nameLocalizations: {
        'pt-BR': 'linguagem',
      },
      description: 'The programming language of the code snippet',
      descriptionLocalizations: {
        'pt-BR': 'A linguagem de programação do snippet de código',
      },
      autocomplete: true,
      required: true,
    },
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'code',
      nameLocalizations: {
        'pt-BR': 'código',
      },
      description: 'The code snippet to execute',
      descriptionLocalizations: {
        'pt-BR': 'O snippet de código a ser executado',
      },
      required: true,
    },
  ],
  acknowledge: true,
  async autocomplete(bot, interaction, options) {
    const focused = options.language;
    const langList = await makeRequest('https://emkc.org/api/v2/piston/runtimes', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
    });

    const langs: any[] = [];
    langList.forEach((runtime: any) => {
      langs.push(runtime.language);
      runtime.aliases.forEach((alias: string) => langs.push(alias));
    });

    const filtered = langs.filter((lang: string) => lang.toLowerCase().slice(0, 25));

    await interaction.respond({ choices: filtered.map((lang: string) => ({ name: lang, value: lang })) });
  },
  async run(interaction, options) {},
});
*/
