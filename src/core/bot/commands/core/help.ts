import { collectors } from "bot/events/interactions";
import {
  ButtonStyles,
  ChannelTypes,
  DiscordApplicationIntegrationType,
  DiscordInteractionContextType,
  InteractionResponseTypes,
  MessageComponentTypes,
  MessageFlags,
  SeparatorSpacingSize,
  TextStyles,
} from "discordeno";
import { Collector } from "helpers/collector";
import createApplicationCommand from "helpers/command";
import {
  ApplicationCommandCategory,
  RateLimitType,
  type Interaction,
} from "types/types";
import { icon, iconAsEmoji, link, smallPill } from "utils/markdown";

createApplicationCommand({
  name: "help",
  nameLocalizations: {
    "pt-BR": "ajuda",
  },
  description: "Learn more about me and what I can do",
  descriptionLocalizations: {
    "pt-BR": "Saiba mais sobre mim e o que posso fazer",
  },
  integrationTypes: [
    DiscordApplicationIntegrationType.GuildInstall,
    DiscordApplicationIntegrationType.UserInstall,
  ],
  contexts: [
    DiscordInteractionContextType.BotDm,
    DiscordInteractionContextType.Guild,
    DiscordInteractionContextType.PrivateChannel,
  ],
  details: {
    category: ApplicationCommandCategory.Core,
  },
  rateLimit: {
    type: RateLimitType.User,
    limit: 1,
    duration: 3,
  },
  acknowledge: true,
  async run(bot, interaction, options) {
    const language = interaction.locale;
    const author = interaction.user;

    const isInGuild =
      interaction.authorizingIntegrationOwners[0] === interaction.guild.id;

    if (isInGuild) {
      const message = await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `# Welcome to Pocket Tool!\nYou can view all the available command on the **${link(
                  "https://komono-website.vercel.app/commands",
                  "website",
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
                  "https://support.discord.com/hc/en-us/articles/216406447-How-can-I-change-Discord-s-Language",
                  "Discord Language Settings",
                )}**!`,
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Small,
                divider: false,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: "## How to customize Pocket Tool?",
              },
              {
                type: MessageComponentTypes.Section,
                components: [
                  {
                    type: MessageComponentTypes.TextDisplay,
                    content:
                      "You can customize this bot however you want: change its name, its entire guild profile, go wild and make it totally your own!",
                  },
                ],
                accessory: {
                  type: MessageComponentTypes.Button,
                  customId: "customize",
                  label: "Customize Me!",
                  emoji: iconAsEmoji("Control"),
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
                content: `-# ${icon("Info")} You can use the **${link(
                  "https://discord.com/blog/slash-commands-permissions-discord-apps-bots",
                  "Discord Integration Settings",
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
                    label: "Join Support",
                    emoji: iconAsEmoji("Discord"),
                    url: "https://discord.gg/7b234YFhmn",
                    style: ButtonStyles.Link,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    label: "Add Pocket Tool",
                    emoji: iconAsEmoji("Link"),
                    url: "https://discord.com/oauth2/authorize?client_id=1240033877917962392",
                    style: ButtonStyles.Link,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: "follow_updates",
                    label: "Follow Updates",
                    emoji: iconAsEmoji("Pin"),
                    style: ButtonStyles.Secondary,
                  },
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      const collector = new Collector<Interaction>();
      collectors.add(collector);

      collector.onCollect(async (i) => {
        // @ts-ignore
        if (i.message?.id !== message.id) return;

        if (i.data?.customId === "customize") {
          await bot.rest.sendInteractionResponse(i.id, i.token, {
            type: InteractionResponseTypes.Modal,
            data: {
              title: "Customize Pocket-Tool as you wish!",
              customId: "customization-modal",
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: "## Shape, twist, and reinvent - at no cost!",
                },
                {
                  type: MessageComponentTypes.Label,
                  description:
                    "This is the name that appears on my guild profile.",
                  label: "What should my name be?",
                  component: {
                    type: MessageComponentTypes.TextInput,
                    customId: "new_name_input",
                    style: TextStyles.Short,
                  },
                },
                {
                  type: MessageComponentTypes.Label,
                  description: "This is the text that appears on my profile.",
                  label: "What's my new about me?",
                  component: {
                    type: MessageComponentTypes.TextInput,
                    customId: "new_about_input",
                    style: TextStyles.Paragraph,
                  },
                },
              ],
            },
          });
        } else if (i.data?.customId === "follow_updates") {
          await i.deferEdit();

          if (!i.member?.permissions?.has("MANAGE_WEBHOOKS")) {
            await i.edit(
              `You need the ${smallPill("MANAGE_WEBHOOKS")} permission to do this.`,
            );
            return;
          }

          const channel = i.channel;
          const source = await i.bot.rest.getChannel("1383924380479918260");
          if (!channel || !source) return;

          if (source.type !== ChannelTypes.GuildAnnouncement) return;

          if (channel.type !== ChannelTypes.GuildText) {
            await i.edit("You can only follow updates in text channels.");
            return;
          }

          await bot.rest.followAnnouncement(
            source.id,
            channel.id!,
            "Following updates from Pocket Tool",
          );
        }
      });
    } else {
      await interaction.edit({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `# Welcome to Pocket Tool!\nYou can view all the available command on the **${link(
                  "https://komono-website.vercel.app/commands",
                  "website",
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
                  "https://support.discord.com/hc/en-us/articles/216406447-How-can-I-change-Discord-s-Language",
                  "Discord Language Settings",
                )}**!`,
              },
              {
                type: MessageComponentTypes.Separator,
                spacing: SeparatorSpacingSize.Large,
                divider: true,
              },
              {
                type: MessageComponentTypes.TextDisplay,
                content: `-# ${icon("Info")} You can use the **${link(
                  "https://discord.com/blog/slash-commands-permissions-discord-apps-bots",
                  "Discord Integration Settings",
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
                    label: "Join Support",
                    emoji: iconAsEmoji("Discord"),
                    url: "https://discord.gg/7b234YFhmn",
                    style: ButtonStyles.Link,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    label: "Add Pocket Tool",
                    emoji: iconAsEmoji("Link"),
                    url: "https://discord.com/oauth2/authorize?client_id=1240033877917962392",
                    style: ButtonStyles.Link,
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
});
