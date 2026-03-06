import { collectors } from 'bot/events/interactions';
import { INVITE_LINK, SUPPORT_SERVER } from 'core/constants';
import {
  ButtonStyles,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  MessageComponentTypes,
  MessageFlags,
  SeparatorSpacingSize,
  TextStyles,
  type MessageComponents,
} from 'discordeno';
import createCollector from 'helpers/collector';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory, type Interaction } from 'types/types';
import { icon, iconAsEmoji, link, pill } from 'utils/markdown';
import or from 'utils/utils';

createApplicationCommand({
  name: 'help',
  nameLocalizations: {
    'pt-BR': 'ajuda',
  },
  description: 'Learn more about me and what I can do',
  descriptionLocalizations: {
    'pt-BR': 'Saiba mais sobre mim e o que posso fazer',
  },
  integrationTypes: [DiscordApplicationIntegrationType.GuildInstall, DiscordApplicationIntegrationType.UserInstall],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Core,
    cooldown: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    await interaction.edit({
      components: [
        {
          type: MessageComponentTypes.Container,
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `# Welcome to Forger!\nYou can view all the available commands by typing ${pill('/')}, for further game assistance which the bot may or may not display go to ${link('https://forgewiki.org/wiki/The_Forge_wiki', 'the official wiki')}.`,
            },
            {
              type: MessageComponentTypes.Separator,
              divider: false,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: '## How to report bugs?',
            },
            {
              type: MessageComponentTypes.Section,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: 'To report bugs simply click the button on the right.',
                },
              ],
              accessory: {
                type: MessageComponentTypes.Button,
                customId: 'bug-reports-button',
                label: 'Report Bugs',
                emoji: iconAsEmoji('Bug'),
                style: ButtonStyles.Secondary,
              },
            },
            {
              type: MessageComponentTypes.Separator,
              divider: true,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `-# ${icon('Exclamation')} You can visit **${link('https://discord.com/blog/slash-commands-permissions-discord-apps-bots', 'Discord Integration Settings')}** to learn how to disable commands.`,
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
                  label: 'Support Server',
                  emoji: iconAsEmoji('Discord'),
                  url: SUPPORT_SERVER,
                  style: ButtonStyles.Link,
                },
                {
                  type: MessageComponentTypes.Button,
                  label: 'Invite Me!',
                  emoji: iconAsEmoji('Link'),
                  url: INVITE_LINK,
                  style: ButtonStyles.Link,
                },
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = createCollector<Interaction>({
      key: 'help-collector',
      filter: (i) => i.user.id === interaction.user.id,
    });
    collectors.add(collector);

    collector.on('collect', async (i) => {
      if (!i.data) return;

      if (i.data.customId === 'bug-reports-button') {
        await i.respond({
          customId: 'bug-reports-modal',
          title: 'Report your bug here.',
          components: [
            {
              type: MessageComponentTypes.Label,
              label: 'Provide bug description.',
              component: {
                type: MessageComponentTypes.TextInput,
                customId: 'bug-reports-description',
                placeholder: 'Type down your bug description here.',
                style: TextStyles.Paragraph,
                required: true,
              },
            },
            {
              type: MessageComponentTypes.Label,
              label: 'Provide steps to reproduce the bug.',
              component: {
                type: MessageComponentTypes.TextInput,
                customId: 'bug-reports-steps',
                placeholder: 'Type down the steps to reproduce the bug here.',
                style: TextStyles.Paragraph,
                required: true,
              },
            },
            {
              type: MessageComponentTypes.Label,
              label: 'Provide screenshots of the bug',
              component: {
                type: MessageComponentTypes.FileUpload,
                customId: 'bug-reports-screenshots',
                minValues: 0,
                maxValues: 4,
                required: false,
              },
            },
          ],
        });
      }

      if (i.data.customId === 'bug-reports-modal') {
        const bugReport = or(i.data.components?.[0]?.component?.value, null);
        const stepsToReproduce = or(i.data.components?.[1]?.component?.value, null);
        const screenshotIds = or(i.data.components?.[2]?.component?.values, null);
        const screenshots = screenshotIds
          ? screenshotIds.map((id) => i.data?.resolved?.attachments?.get(BigInt(id)))
          : null;

        if (screenshots && !screenshots.every((s) => s?.contentType?.startsWith('image/'))) {
          await i.respond({
            components: [
              {
                type: MessageComponentTypes.Container,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `${icon('Warning')} Please provide a valid image file.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });

          return;
        }

        const screenshotUrls = screenshots?.map((s) => s?.url).filter(Boolean) ?? [];

        const bugReportId = crypto.randomUUID();

        await bot.helpers.createForumThread('1467550986129113169', {
          name: bugReportId,
          appliedTags: ['1467551226378981428', '1473484695856484372'],
          message: {
            components: [
              {
                type: MessageComponentTypes.Container,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `Bug report by: <@${interaction.user.id}> (${interaction.user.id})`,
                  },
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `## Bug Description\n${bugReport || 'No description provided.'}`,
                  },
                  {
                    type: MessageComponentTypes.Separator,
                  },
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content: `## Steps to Reproduce\n${stepsToReproduce || 'No steps provided.'}`,
                  },
                  ...(screenshotUrls.length > 0
                    ? ([
                        {
                          type: MessageComponentTypes.Separator,
                        },
                        {
                          type: MessageComponentTypes.MediaGallery,
                          items: screenshotUrls
                            .filter((url): url is string => url !== undefined)
                            .map((url: string) => ({
                              media: {
                                type: 'image',
                                url: url,
                              },
                            })),
                        },
                      ] satisfies MessageComponents)
                    : []),
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          },
        });

        await i.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Correct')} Bug report submitted successfully!\n-# Your bug report ID: ${bugReportId}`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
    });
  },
});
