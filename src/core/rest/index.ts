import type { RequestMethods } from "discordeno";
import { REST_URL, REST_PORT } from "../../utils/variables";
import { buildFastifyApp, parseMultiformBody } from "./fastify";
import { rest, logger } from "./rest";

const app = buildFastifyApp()

app.get('/timecheck', async (_req, res) => {
  res.status(200).send({ message: Date.now() })
})

app.all('/*', async (req, res) => {
  let url = req.originalUrl

  if (url.startsWith('/v')) {
    url = url.slice(url.indexOf('/', 2))
  }

  const isMultipart = req.headers['content-type']?.startsWith('multipart/form-data')
  const hasBody = req.method !== 'GET' && req.method !== 'DELETE'
  const body = hasBody ? (isMultipart ? await parseMultiformBody(req.body) : req.body) : undefined

  try {
    const result = await rest.makeRequest(req.method as RequestMethods, url, {
      body
    })

    if (result) {
      res.status(200).send(result)
      return;
    }

    res.status(204).send({})
  } catch (e) {
    logger.error(e)

    res.status(500).send({
      message: e
    })
  }
})

await app.listen({ port: Number(REST_PORT) })