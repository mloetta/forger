import { ApplicationCommandOptionTypes, MessageComponentTypes, MessageFlags } from 'discordeno';
import createApplicationCommand from 'helpers/command';
import { ApplicationCommandCategory } from 'types/types';
import { icon } from 'utils/markdown';
import { redis } from 'utils/redis';

createApplicationCommand({
  name: 'blacklist',
  description: 'Blacklists or removes users from the bot blacklist',
  details: {
    category: ApplicationCommandCategory.Dev,
  },
  options: [
    {
      type: ApplicationCommandOptionTypes.User,
      name: 'user',
      description: 'The user to blacklist or remove',
      required: true,
    },
    {
      type: ApplicationCommandOptionTypes.Boolean,
      name: 'remove',
      description: 'Set to true to remove the user from the blacklist',
      required: false,
    },
  ],
  dev: true,
  acknowledge: true,
  async run(bot, interaction, options) {
    const user = options.user.user;
    const remove = options.remove ?? false;
    const key = 'blacklist:users';

    if (remove) {
      const removed = await redis.sRem(key, user.id.toString());
      if (removed) {
        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Correct')} <@${user.id}> was removed from the blacklist.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Wrong')} <@${user.id}> was not found in the blacklist.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }
    } else {
      const alreadyBlacklisted = await redis.sIsMember(key, user.id.toString());
      if (alreadyBlacklisted) {
        await interaction.respond({
          components: [
            {
              type: MessageComponentTypes.Container,
              components: [
                {
                  type: MessageComponentTypes.TextDisplay,
                  content: `${icon('Wrong')} <@${user.id}> is already blacklisted.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      await redis.sAdd(key, user.id.toString());

      await interaction.respond({
        components: [
          {
            type: MessageComponentTypes.Container,
            components: [
              {
                type: MessageComponentTypes.TextDisplay,
                content: `${icon('Correct')} <@${user.id}> was added to the blacklist successfully!`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
});
