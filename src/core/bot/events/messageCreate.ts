import { Collection } from 'discordeno';
import createEvent from 'helpers/event';
import { debounce } from 'utils/utils';
import { getXataClient } from 'utils/xata';
import { bot } from 'bot/bot';
import { fetch } from 'bun';
import type { Message } from 'types/types';
import { t } from 'utils/i18n';

const messageCreateHandlers = new Collection<string, (message: Message) => Promise<void>>();

createEvent({
  name: 'messageCreate',
  async run(message) {
    for (const handler of messageCreateHandlers.values()) {
      await handler(message);
    }
  },
});

messageCreateHandlers.set('stickyMessage', async (message) => {
  if (!message.guildId || message.author.bot) return;

  const language = (await bot.rest.getGuild(message.guildId)).preferredLocale;

  const xata = getXataClient();
  const debouncedChannels = new Collection<string, ReturnType<typeof debounce>>();

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
            bot.logger.error('Error deleting sticky message:', e);
          }
        }

        let filesToSend: { name: string; blob: Blob }[] = [];
        if (sticky.files?.length) {
          filesToSend = await Promise.all(
            sticky.files.map(async (file: any) => {
              const res = await fetch(file.url);
              const arrayBuffer = await res.arrayBuffer();
              return {
                name: file.filename,
                blob: new Blob([arrayBuffer], { type: file.contentType }),
              };
            }),
          );
        }

        const sent = await bot.rest.sendMessage(message.channelId, {
          content: `${sticky.content ?? ''}\n${t(language, 'events.messageCreate.stickyMessage.warn')}`,
          attachments:
            sticky.files?.map((f: any, i: number) => ({
              id: i,
              filename: f.filename,
            })) ?? [],
          files: filesToSend,
        });

        await xata.db.sticky_messages.update(sticky.id, {
          message_id: sent.id,
        });
      }, 10000),
    );
  }

  debouncedChannels.get(message.channelId.toString())!();
});
