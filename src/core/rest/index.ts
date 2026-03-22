import type { RequestMethods } from 'discordeno';
import { REST_PORT } from 'core/variables';
import { buildFastifyApp, parseMultiformBody } from './fastify';
import { rest, logger } from './rest';
import 'utils/process';

const app = await buildFastifyApp();

app.get('/timecheck', async (_req, res) => {
  res.status(200).send({ message: Date.now() });
});

app.all('/*', async (req, res) => {
  let url = req.originalUrl;

  if (url.startsWith('/v')) {
    url = url.slice(url.indexOf('/', 2));
  }

  const isMultipart = req.headers['content-type']?.startsWith('multipart/form-data');
  const body = req.method !== 'GET' && req.method !== 'DELETE' ? req.body : undefined;

  try {
    const result = await rest.makeRequest(req.method as RequestMethods, url, {
      body: isMultipart && body ? await parseMultiformBody(body) : body,
    });

    if (result) {
      res.status(200).send(result);
    } else {
      res.status(204).send({});
    }
  } catch (e) {
    logger.error(e);

    res.status(500).send({
      message: e,
    });
  }
});

await app.listen({ host: app.config.host, port: Number(REST_PORT) });

logger.info(`REST is listening on port ${REST_PORT}`);
