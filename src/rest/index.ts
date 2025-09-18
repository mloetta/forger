import express from 'express'
import { rest } from './rest'
import type { RequestMethods } from 'discordeno';
import { AUTHORIZATION, REST_PORT, REST_URL } from '../utils/variables';

const app = express();

app.use(
  express.urlencoded({
    extended: true
  }),
)

app.use(express.json())

app.all('/*path', async (req, res) => {
  if (!AUTHORIZATION || AUTHORIZATION !== req.headers.authorization) {
    return res.status(401).json({ error: 'Invalid authorization key.' })
  }

  try {
    const result = await rest.makeRequest(req.method as RequestMethods, req.url.substring(4), {
      body: req.method !== 'DELETE' && req.method !== 'GET' ? req.body : undefined,
    })

    if (result) {
      res.status(200).json(result)
    } else {
      res.status(204).json()
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e)
  }
})

app.listen(REST_PORT, () => {
  console.log(`REST listening at ${REST_URL}`)
})