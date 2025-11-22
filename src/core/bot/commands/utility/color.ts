import { createCanvas } from '@napi-rs/canvas';
import {
  convertToHex,
  convertToHsl,
  convertToRgb,
  isHex,
  isHsl,
  isRgb,
  type Hexadecimal,
  type Hsl,
  type Rgb,
} from '@tolga1452/toolbox.js';
import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType } from 'types/types';
import { t } from 'utils/i18n';
import { icon, smallPill } from 'utils/markdown';

createApplicationCommand({
  name: 'color',
  nameLocalizations: {
    'pt-BR': 'cor',
  },
  description: 'Shows a preview of the given color from HEX/RGB/HSL input',
  descriptionLocalizations: {
    'pt-BR': 'Mostra uma pré-visualização da cor fornecida em HEX/RGB/HSL',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Utility,
  },
  rateLimit: {
    type: RateLimitType.User,
    duration: 3,
    limit: 1,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'color',
      nameLocalizations: {
        'pt-BR': 'cor',
      },
      description: 'The color to preview',
      descriptionLocalizations: {
        'pt-BR': 'A cor para pré-visualizar',
      },
      required: true,
    },
  ],
  acknowledge: true,
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    const color = options.color;

    let hex: Hexadecimal | undefined;
    let rgb: Rgb | undefined;
    let hsl: Hsl | undefined;

    if (isHex(color)) {
      hex = color as Hexadecimal;
      rgb = convertToRgb(hex);
      hsl = convertToHsl(hex);
    } else if (isRgb(JSON.parse(color))) {
      rgb = JSON.parse(color) as Rgb;
      hex = convertToHex(rgb);
      hsl = convertToHsl(rgb);
    } else if (isHsl(JSON.parse(color))) {
      hsl = JSON.parse(color) as Hsl;
      hex = convertToHex(hsl, true);
      rgb = convertToRgb(hsl, true);
    } else {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Error')} ${t(language, 'commands.color.invalidColor')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const canvas = createCanvas(300, 300);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 300, 300);

    const buffer = canvas.toBuffer('image/png');
    if (!buffer) return;

    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## ${icon('Colors')} ${t(language, 'commands.color.convertedSuccessfully')}\nHEX: ${smallPill(hex)}\nRGB: ${smallPill(rgb)}\nHSL: ${smallPill(hsl)}`,
            },
            {
              type: MessageComponentTypes.MediaGallery,
              items: [
                {
                  media: {
                    url: 'attachment://color.png',
                  },
                },
              ],
            },
          ],
        },
      ],
      files: [
        {
          name: 'color.png',
          blob: new Blob([buffer], { type: 'image/png' }),
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
