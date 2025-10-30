import { Collection } from 'discordeno';
import createEvent from 'helpers/event';
import { debounce } from 'utils/utils';
import { getXataClient } from 'utils/xata';
import { bot } from 'bot/bot';

const debouncedChannels = new Collection<string, ReturnType<typeof debounce>>();

createEvent({
  name: 'messageCreate',
  async run(message) {
    if (!message.guildId || message.author.bot) return;

    const xata = getXataClient();

    if (!debouncedChannels.has(message.channelId.toString())) {
      debouncedChannels.set(
        message.channelId.toString(),
        debounce(async () => {
          const sticky = await xata.db.sticky_messages
            .filter('guild_id', message.guildId?.toString())
            .filter('channel_id', message.channelId.toString())
            .getFirst();

          if (!sticky) return;

          if (sticky.message_id) {
            try {
              await bot.rest.deleteMessage(message.channelId, BigInt(sticky.message_id));
            } catch (e) {
              bot.logger.error(e);
            }
          }

          const sent = await bot.rest.sendMessage(message.channelId, {
            content: sticky.content ?? undefined,
            files: sticky.files?.map((file, i) => ({
              name: `file${i + 1}`,
              blob: new Blob([Buffer.from(file, 'base64')]),
            })),
          });

          await xata.db.sticky_messages.update(sticky.id, {
            message_id: sent.id,
          });
        }, 5000),
      );
    }

    debouncedChannels.get(message.channelId.toString())!();
  },
});
