import { createClient } from 'redis';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from 'core/variables';

export const redis = createClient({
  username: 'default',
  password: REDIS_PASSWORD,
  socket: {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
  },
});

await redis.connect();
