import { bot } from 'bot/bot';
import { collectors } from 'bot/events/interactions';
import { INVITE_LINK, SUPPORT_SERVER } from 'core/constants';
import { Emoji } from 'core/emojis';
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
import { ApplicationCommandCategory, type ApplicationCommand, type Interaction } from 'types/types';
import { commandMention, icon, iconAsEmoji, link, pill, smallPill } from 'utils/markdown';
import { redis } from 'utils/redis';
import or from 'utils/utils';

createApplicationCommand({
  name: 'help',
  description: 'Learn more about me and what I can do',
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
              content: '# Welcome to Forger!',
            },
            {
              type: MessageComponentTypes.Section,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `You can view all the available commands by typing ${pill('/')}, or by clicking the button on the right, for further game assistance which the bot may or may not display go to ${link('https://forgewiki.org/wiki/The_Forge_wiki', 'the official wiki')}.`,
                },
              ],
              accessory: {
                type: MessageComponentTypes.Button,
                style: ButtonStyles.Secondary,
                customId: 'view-all-commands',
                label: 'View All Commands',
                emoji: iconAsEmoji(Emoji.List),
              },
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: '## How to support the bot?',
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `You can support the bot by voting it in **${link('https://top.gg/bot/1461873695688491190/vote', 'top.gg')}**! Every vote helps is appreciated, helps the bot grow and reach more people.`,
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
                style: ButtonStyles.Secondary,
                customId: 'bug-reports-button',
                label: 'Report Bugs',
                emoji: iconAsEmoji(Emoji.Bug),
              },
            },
            {
              type: MessageComponentTypes.Separator,
            },
            {
              type: MessageComponentTypes.TextDisplay,
              content: `-# ${icon(Emoji.Exclamation)} You can visit **${link('https://discord.com/blog/slash-commands-permissions-discord-apps-bots', 'Discord Integration Settings')}** to learn how to disable commands.`,
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
                  emoji: iconAsEmoji(Emoji.Discord),
                  url: SUPPORT_SERVER,
                  style: ButtonStyles.Link,
                },
                {
                  type: MessageComponentTypes.Button,
                  label: 'Invite Me!',
                  emoji: iconAsEmoji(Emoji.Link),
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

      if (i.data.customId === 'view-all-commands') {
        const commandIds = await redis.hGetAll('commands:ids');

        const commandList = [...bot.commands.values()]
          .filter((cmd) => !(cmd as ApplicationCommand).dev)
          .map((cmd) => {
            const id = commandIds[cmd.name];
            return id
              ? `> ${commandMention(cmd.name, id)} - ${cmd.description}`
              : `> \`/${cmd.name}\` - ${cmd.description}`;
          })
          .join('\n');

        await i.respond({
          customId: 'all-commands-modal',
          title: 'Command List',
          components: [
            {
              type: MessageComponentTypes.TextDisplay,
              content: `## Here you can view all the commands available in the bot.\n${commandList}`,
            },
          ],
        });
      } else if (i.data.customId === 'bug-reports-button') {
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
      } else if (i.data.customId === 'bug-reports-modal') {
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
                    content: `${icon(Emoji.Warning)} Please provide a valid image file.`,
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
                  content: `${icon(Emoji.Correct)} Bug report submitted successfully!\n-# Your bug report ID: ${bugReportId}`,
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
