import fastifyEnv from '@fastify/env';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastify, { type FastifyInstance } from 'fastify';

export async function buildFastifyApp(): Promise<FastifyInstance> {
  const app = fastify();

  await app.register(fastifyEnv, {
    schema: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          default: 'localhost',
        },
        bot_token: {
          type: 'string',
          minLength: 1,
        },
      },
      required: ['bot_token'],
    },
  });

  await app.register(fastifyHelmet);
  app.register(fastifyMultipart, { attachFieldsToBody: true });

  // Authorization check
  app.addHook('onRequest', async (req, res) => {
    if (req.headers.authorization !== req.server.config.bot_token) {
      res.status(401).send({
        message: 'Credentials not valid.',
      });
    }
  });

  return app;
}
