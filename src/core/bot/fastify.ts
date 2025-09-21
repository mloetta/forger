import fastify, { type FastifyInstance } from 'fastify'
import { AUTHORIZATION } from 'utils/variables'

export function buildFastifyApp(): FastifyInstance {
  const app = fastify()

  // Authorization check
  app.addHook('onRequest', async (req, res) => {
    if (req.headers.authorization !== AUTHORIZATION) {
      res.status(401).send({
        message: 'Credentials not valid.',
      })
    }
  })

  return app
}