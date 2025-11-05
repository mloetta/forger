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

  const language = (await bot.helpers.getGuild(message.guildId)).preferredLocale;

  const xata = getXataClient();
  const debouncedChannels = new Collection<string, ReturnType<typeof debounce>>();

  const channelId = message.channelId.toString();
  const guildId = message.guildId.toString();

  if (!debouncedChannels.has(channelId)) {
    debouncedChannels.set(
      channelId,
      debounce(async () => {
        const sticky = await xata.db.sticky_messages
          .filter('guild_id', guildId)
          .filter('channel_id', channelId)
          .getFirst();

        if (!sticky) return;

        if (sticky.message_id) {
          try {
            await bot.helpers.deleteMessage(BigInt(channelId), BigInt(sticky.message_id));
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

        const sent = await bot.helpers.sendMessage(BigInt(channelId), {
          content: `${sticky.content ?? ''}\n${t(language, 'events.messageCreate.stickyMessage.warn')}`,
          attachments:
            sticky.files?.map((f: any, i: number) => ({
              id: i,
              filename: f.filename,
            })) ?? [],
          files: filesToSend,
        });

        await xata.db.sticky_messages.update(sticky.id, {
          message_id: sent.id.toString(),
        });
      }, 10000),
    );
  }

  debouncedChannels.get(channelId)!();
});
