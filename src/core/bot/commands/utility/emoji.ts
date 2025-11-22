import {
  ApplicationCommandOptionTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  snowflakeToTimestamp,
  type ContainerComponent,
} from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, RateLimitType } from 'types/types';
import { CDN } from 'utils/cdn';
import twemoji from 'twemoji';
import { makeRequest, RequestMethod, ResponseType } from 'utils/request';
import { EMOJI_KITCHEN_API_KEY, GOOGLE_API_KEY } from 'core/variables';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { icon, iconPill, pill, timestamp, TimestampStyle } from 'utils/markdown';
import { t } from 'utils/i18n';

type Emoji =
  | { type: 'custom'; animated: boolean; id: string; name: string; markdown: string; url: string }
  | { type: 'unicode'; code: string; emoji: string; url: string };

createApplicationCommand({
  name: 'emoji',
  description: 'View properties or mix emojis',
  descriptionLocalizations: {
    'pt-BR': 'Veja as propriedades ou misture emojis',
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
    duration: 5,
    limit: 1,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.String,
      name: 'emoji',
      description: 'The emojis to view or mix',
      descriptionLocalizations: {
        'pt-BR': 'Os emojis para visualizar ou misturar',
      },
      required: true,
    },
  ],
  acknowledge: true,
  async run(bot, interaction, options, extras) {
    const language = interaction.locale!;

    const input = options.emoji.trim();
    const regex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>|(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;
    const matches: Emoji[] = Array.from(input.matchAll(regex), (match) => {
      const isCustom = Boolean(match[3]);
      if (isCustom) {
        const animated = Boolean(match[1]);
        const id = match[3]!;
        const name = match[2]!;

        return {
          type: 'custom',
          animated,
          id,
          name,
          markdown: animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`,
          url: CDN.emoji(id, animated ? 'gif' : 'png'),
        };
      } else {
        const emoji = match[0];
        const code = twemoji.convert.toCodePoint(emoji);

        return {
          type: 'unicode',
          code,
          emoji,
          url: `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${code}.svg`,
        };
      }
    });

    if (matches.length === 0) {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Error')} ${t(language, 'commands.emoji.noValidEmojis')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const customs = matches.filter((match) => match.type === 'custom');

    if (matches.length === 2 && matches.every((match) => match.type === 'unicode')) {
      const emj = matches.map((match) => match.emoji);

      const res = await makeRequest('https://tenor.googleapis.com/v2/featured', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        params: {
          q: emj.join('_'),
          key: GOOGLE_API_KEY,
          contentFilter: 'high',
          media_filter: 'png_transparent',
          component: 'proactive',
          collection: 'emoji_kitchen_v6',
        },
      });

      const mix = res.results[0].media_formats?.png_transparent?.url;
      if (!mix) {
        await interaction.edit({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Error')} ${t(language, 'commands.emoji.mixNotAvailable')}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.MediaGallery,
                items: [
                  {
                    media: {
                      url: mix,
                    },
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (matches.length === 1 && matches[0]!.type === 'unicode') {
      const emj = matches[0];
      if (!emj) return;

      const res = await makeRequest('https://emoji-api.com/emojis', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        params: {
          access_key: EMOJI_KITCHEN_API_KEY,
        },
      });

      const emoji = res.find((e: any) => e.codePoint.toUpperCase() === emj.code.toUpperCase());

      // Emoji media manipulation
      const svg = await fetch(emj.url).then((res) => res.arrayBuffer());
      const buffer = Buffer.from(svg);
      const img = await loadImage(buffer);

      const width = 512;
      const height = 512;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, width, height);

      const scale = Math.min(width / img.width, height / img.height);
      const x = (width - img.width * scale) / 2;
      const y = (height - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      const png = canvas.toBuffer('image/png');

      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Emoji')} **${emoji.unicodeName}**\n${pill(emoji.codePoint)}`,
              },
              {
                type: MessageComponentTypes.MediaGallery,
                items: [
                  {
                    media: {
                      url: 'attachment://emoji.png',
                    },
                  },
                ],
              },
            ],
          },
        ],
        files: [
          {
            name: 'emoji.png',
            blob: new Blob([png], { type: 'image/png' }),
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (customs.length === 0) {
      const container = {
        type: MessageComponentTypes.Container,
        components: [] as any,
      } satisfies ContainerComponent;

      function escapeEmoji(str: string) {
        return str.replace(/</g, '\\<');
      }

      for (const emj of customs) {
        container.components.push(
          {
            type: MessageComponentTypes.TextDisplay,
            content: `${icon('Emoji')} **${escapeEmoji(emj.markdown)}** ${pill(emj.id)}\n${iconPill('Calendar', t(language, 'commands.emoji.emojiCreatedAt'))} ${timestamp(snowflakeToTimestamp(emj.id), TimestampStyle.LongDate)}`,
          },
          {
            type: MessageComponentTypes.MediaGallery,
            items: [
              {
                media: {
                  url: emj.url,
                },
              },
            ],
          },
        );
      }

      await interaction.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
});
