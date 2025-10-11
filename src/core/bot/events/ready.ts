import { bot } from "bot/bot";
import { ActivityTypes, createLogger } from "discordeno";
import createEvent from "helpers/event";

const logger = createLogger({ name: "ready" });

createEvent({
  name: "ready",
  run({ shardId }) {
    logger.info(`Shard ID #${shardId} is ready.`);

    bot.gateway.editShardStatus(shardId, {
      status: "online",
      since: null,
      afk: false,
      activities: [
        {
          type: ActivityTypes.Custom,
          name: "shardId status",
          state: `You're on shard #${shardId}!`,
        },
      ],
    });
  },
});
