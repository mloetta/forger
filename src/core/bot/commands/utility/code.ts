import { ApplicationCommandOptionTypes, Collection, MessageComponentTypes, MessageFlags } from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, ApplicationCommandScope, RateLimitType } from 'types/types';
import { t } from 'utils/i18n';
import { codeblock, icon, stringwrapPreserveWords } from 'utils/markdown';
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
    duration: 5,
    limit: 1,
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
  async autocomplete(bot, interaction, options, extras) {
    const focused = interaction.data?.options?.find((opt) => opt.focused)?.value?.toString();

    if (!focused) return;

    const langList = await makeRequest('https://emkc.org/api/v2/piston/runtimes', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
    });

    const langs: any[] = [];
    langList.forEach((runtime: any) => {
      langs.push(runtime.language);
      runtime.aliases.forEach((alias: string) => langs.push(alias));
    });

    const filtered = langs.filter((lang: string) => lang.toLowerCase().startsWith(focused.toLowerCase())).slice(0, 25);

    const choices = filtered.map((lang: string) => ({ name: lang, value: lang }));

    await interaction.respond({ choices });
  },
  async run(bot, interaction, options) {
    const language = interaction.locale!;

    const lang = options.language;
    const code = options.code;

    const langList = await makeRequest('https://emkc.org/api/v2/piston/runtimes', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
    });

    const langs = new Collection<string, string>();
    langList.forEach((runtime: any) => {
      langs.set(runtime.language.toLowerCase(), runtime.language);
      runtime.aliases.forEach((alias: string) => {
        langs.set(alias.toLowerCase(), runtime.language);
      });
    });

    const codeLang = langs.get(lang);
    if (!codeLang) {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Error')} ${t(language, 'commands.code.invalidLanguage')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const res = await makeRequest('https://emkc.org/api/v2/piston/execute', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      data: {
        language: codeLang,
        version: '*',
        files: [{ content: code }],
        stdin: '',
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      },
    });

    const output = stringwrapPreserveWords(res.run.stderr.trim() !== '' ? res.run.stderr : res.run.stdout, 2000);

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: codeblock(res.stderr ? 'bash' : lang, output),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
