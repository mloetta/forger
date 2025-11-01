import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      host: string;
      bot_token: string;
    };
  }
}
