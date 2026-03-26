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
  if (!signatureHeader) {
    logger.warn('[verifySignature] Missing x-topgg-signature header');
    return res.status(401).send('Missing signature');
  }

  const parsedSignature = signatureHeader.split(',').map((part: any) => part.split('='));
  const sigObj = Object.fromEntries(parsedSignature);
  const timestamp = sigObj[timestampKey];
  const signature = sigObj[versionKey];

  if (!timestamp || !signature) {
    logger.warn('[verifySignature] Invalid signature format', { signatureHeader });
    return res.status(400).send('Invalid signature format');
  }

  const hmac = crypto.createHmac('sha256', TOPGG_WEBHOOK_SECRET);
  const digest = hmac.update(`${timestamp}.${req.rawBody}`).digest('hex');

  if (signature !== digest) {
    logger.warn('[verifySignature] Signature mismatch', {
      timestamp,
      provided: signature,
      computed: digest,
    });
    return res.status(403).send('Invalid signature');
  }

  logger.info('[verifySignature] Signature verified');
  next();
};

// The Webhook Endpoint
app.post('/webhook/topgg', verifySignature, async (req, res) => {
  const { type, data } = req.body;
  const traceId = req.headers['x-topgg-trace'];

  logger.info('[webhook] Incoming request', {
    type,
    traceId,
    userRaw: data?.user,
    expiresAtRaw: data?.expires_at,
    hasCreatedAt: Boolean(data?.created_at),
  });

  if (type === 'vote.create') {
    const userId = String(data?.user?.id ?? data?.user ?? '');
    const expiresAt = String(data?.expires_at ?? '');

    logger.info('[vote.create] Parsed payload', {
      userId,
      expiresAt,
      now: Date.now(),
    });

    if (!userId || userId === 'undefined' || userId === 'null') {
      logger.error('[vote.create] Missing/invalid vote user id', { userRaw: data?.user, traceId });
      return res.status(400).send('Missing vote user id');
    }

    const expiresAtMs = Number(expiresAt);
    const ttlSeconds =
      Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() ? Math.floor((expiresAtMs - Date.now()) / 1000) : 0;

    logger.info('[vote.create] TTL calculation', {
      expiresAtMs,
      ttlSeconds,
      expiresAtIsFinite: Number.isFinite(expiresAtMs),
      expiresAtGtNow: expiresAtMs > Date.now(),
    });

    const userVotesKey = `topgg:votes:user:${userId}`;
    const usersSetKey = 'topgg:votes:users';
    const expiresKey = `topgg:votes:expires:${userId}`;
    const activeKey = `topgg:votes:active:${userId}`;

    await redis.incr(userVotesKey);
    await redis.sAdd(usersSetKey, userId);
    await redis.set(expiresKey, expiresAt);

    if (ttlSeconds > 0) {
      await redis.set(activeKey, '1', { EX: ttlSeconds });
      const ttlAfterSet = await redis.ttl(activeKey);
      const activeValue = await redis.get(activeKey);

      logger.info('[vote.create] Active vote key set', {
        activeKey,
        activeValue,
        ttlAfterSet,
      });
    } else {
      await redis.del(activeKey);
      logger.warn('[vote.create] Active vote key removed because ttlSeconds <= 0', { activeKey, ttlSeconds });
    }

    const totalVotes = await redis.get(userVotesKey);
    const expiresStored = await redis.get(expiresKey);
    const activeExists = await redis.exists(activeKey);

    logger.info('[vote.create] Redis write summary', {
      userId,
      totalVotes,
      expiresStored,
      activeExists,
      activeKey,
      traceId,
    });
  }

  res.status(200).send('Webhook received successfully');
});

app.listen(TOPGG_PORT, () => logger.info(`Topgg is listening on port ${TOPGG_PORT}`));
