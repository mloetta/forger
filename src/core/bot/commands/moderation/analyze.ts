import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, ApplicationCommandScope, RateLimitType } from 'types/types';
import { formatAnsi, type ColorsType } from 'utils/ansi';
import { t } from 'utils/i18n';
import { codeblock, highlight, iconPill, link } from 'utils/markdown';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';
import { PERSPECTIVE_API_KEY } from 'core/variables';

createApplicationCommand({
  name: 'analyze',
  nameLocalizations: {
    'pt-BR': 'analisar',
  },
  description: "Analyze the given messagge using Google's Perspective API",
  descriptionLocalizations: {
    'pt-BR': 'Analisa a mensagem fornecido usando a API do Google Perspective',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Moderation,
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
      name: 'message',
      nameLocalizations: {
        'pt-BR': 'mensagem',
      },
      description: 'The message to analyze',
      descriptionLocalizations: {
        'pt-BR': 'A mensagem a ser analisada',
      },
      required: true,
    },
  ],
  acknowledge: true,
  async run(bot, interaction, options) {
    const language = interaction.locale!;

    const msg = options.message;

    const req = await makeRequest('https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        key: PERSPECTIVE_API_KEY,
      },
      data: {
        comment: { text: msg },
        languages: [language],
        requestedAttributes: {
          LIKELY_TO_REJECT: {},
          UNSUBSTANTIAL: {},
          INCOHERENT: {},
          ATTACK_ON_COMMENTER: {},
          OBSCENE: {},
          OFF_TOPIC: {},
          INFLAMMATORY: {},
          FLIRTATION: {},
          ATTACK_ON_AUTHOR: {},
          SPAM: {},
          TOXICITY: {},
          PROFANITY: {},
          SEXUALLY_EXPLICIT: {},
          INSULT: {},
          THREAT: {},
          IDENTITY_ATTACK: {},
          SEVERE_TOXICITY: {},
        },
      },
    });

    const res = Object.keys(req.attributeScores)
      .map((key) => {
        const raw = req.attributeScores[key].summaryScore.value;
        const score = (raw * 100).toFixed(1);
        const formattedScores = key
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/^\w/, (c) => c.toUpperCase());

        let color = 'g';
        if (raw >= 0.9) color = 'm';
        else if (raw >= 0.76) color = 'r';
        else if (raw >= 0.5) color = 'y';

        return {
          display: formatAnsi(`${score}%`, color as ColorsType) + `   ${formattedScores}`,
          numeric: parseFloat(score),
        };
      })
      .sort((a, b) => b.numeric - a.numeric)
      .map((item) => item.display);

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `${iconPill('Insights', t(language, 'commands.analyze.scores'))} ${link('https://developers.perspectiveapi.com/s/about-the-api-attributes-and-languages', t(language, 'commands.analyze.meaning'), t(language, 'commands.analyze.details'))}\n${t(language, 'commands.analyze.flagged', { msg: highlight(msg), results: codeblock('ansi', res.join('\n')) })}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
