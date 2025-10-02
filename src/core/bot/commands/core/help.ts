import {
  ButtonStyles,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  SeparatorSpacingSize,
  TextStyles,
} from 'discordeno';
import type { ApplicationCommand } from 'helpers/command';
import { icon, iconAsEmoji, link } from 'utils/markdown';

export default {
  name: {
    global: 'help',
    'pt-BR': 'ajuda',
  },
  description: {
    global: 'Learn more about me and what I can do',
    'pt-BR': 'Saiba mais sobre mim e o que posso fazer',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: 'Core',
  },
  rateLimit: {
    type: 'User',
    limit: 1,
    duration: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    const language = interaction.locale;
    const author = interaction.user;

    if (interaction.guild) {
      const message = await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `# Welcome to Pocket Tool!\nYou can view all the available command on the **${link(
                  'https://komono-website.vercel.app/commands',
                  'website',
                )}**`,
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `## How to change slash command language?\nSlash commands are available in multiple languages and will automatically match your **${link(
                  'https://support.discord.com/hc/en-us/articles/216406447-How-can-I-change-Discord-s-Language',
                  'Discord Language Settings',
                )}**!`,
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: '## How to customize Pocket Tool?',
              },
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content:
                      'You can customize this bot however you want: change its name, its entire guild profile, go wild and make it totally your own!',
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: 'customize',
                  label: 'Customize Me!',
                  emoji: iconAsEmoji('Control'),
                  style: ButtonStyles.Secondary,
                },
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Large,
                divider: true,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `-# ${icon('Info')} You can use the **${link(
                  'https://discord.com/blog/slash-commands-permissions-discord-apps-bots',
                  'Discord Integration Settings',
                )}** to disable commands`,
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    label: 'Join Support',
                    emoji: iconAsEmoji('Discord'),
                    url: 'https://discord.gg/7b234YFhmn',
                    style: ButtonStyles.Link,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    label: 'Add Pocket Tool',
                    emoji: iconAsEmoji('Link'),
                    url: 'https://discord.com/oauth2/authorize?client_id=1240033877917962392',
                    style: ButtonStyles.Link,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'follow_updates',
                    label: 'Follow Updates',
                    emoji: iconAsEmoji('Pin'),
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
} satisfies ApplicationCommand;
