import express from 'express';
import { TOPGG_PORT, TOPGG_WEBHOOK_SECRET } from 'core/variables';
import crypto from 'crypto';
import { redis } from 'utils/redis';
import { createLogger } from 'discordeno';

const logger = createLogger({ name: 'TOP.GG' });

const app = express();

const timestampKey = 't';
const versionKey = 'v1';

app.use(
  express.json({
    verify: (req, _, buf) => {
      (req as any).rawBody = buf.toString();
    },
  }),
);

const verifySignature = (req: any, res: any, next: any) => {
  const signatureHeader = req.headers['x-topgg-signature'];
  if (!signatureHeader) return res.status(401).send('Missing signature');

  const parsedSignature = signatureHeader.split(',').map((part: any) => part.split('='));
  const sigObj = Object.fromEntries(parsedSignature);
  const timestamp = sigObj[timestampKey];
  const signature = sigObj[versionKey];

  if (!timestamp || !signature) return res.status(400).send('Invalid signature format');

  const hmac = crypto.createHmac('sha256', TOPGG_WEBHOOK_SECRET);
  const digest = hmac.update(`${timestamp}.${req.rawBody}`).digest('hex');

  if (signature !== digest) return res.status(403).send('Invalid signature');

  next();
};

// The Webhook Endpoint
app.post('/webhook/topgg', verifySignature, async (req, res) => {
  const { type, data } = req.body;
  const traceId = req.headers['x-topgg-trace'];

  if (type === 'vote.create') {
    const userId = String(data.user?.id);
    const expiresAt = String(data.expires_at);

    if (!userId) {
      return res.status(400).send('Missing vote user id');
    }

    const expiresAtMs = Number(expiresAt);
    const ttlSeconds =
      Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() ? Math.floor((expiresAtMs - Date.now()) / 1000) : 0;

    await redis.incr(`topgg:votes:user:${userId}`);
    await redis.sAdd('topgg:votes:users', userId);
    await redis.set(`topgg:votes:expires:${userId}`, expiresAt);

    if (ttlSeconds > 0) {
      await redis.set(`topgg:votes:active:${userId}`, '1', { EX: ttlSeconds });
    } else {
      await redis.del(`topgg:votes:active:${userId}`);
    }

    logger.info(`Vote received from ${userId}`);
  }

  res.status(200).send('Webhook received successfully');
});

app.listen(TOPGG_PORT, () => logger.info(`Topgg is listening on port ${TOPGG_PORT}`));
