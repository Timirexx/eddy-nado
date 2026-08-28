import { getLeaderboard, isConfigured, POINTS } from './_leaderboard-store.js';
import { checkRateLimit } from './_rate-limit.js';

const PERIODS = ['day', 'week', 'month', 'all'];
const MAX_LIMIT = 50;

/** Loose check that a value looks like an EVM address before it becomes a Redis key. */
const isAddress = (v) => typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET.' });
  }

  const limit = await checkRateLimit(req);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: limit.reason });
  }

  const period = PERIODS.includes(req.query?.period) ? req.query.period : 'all';
  const address = isAddress(req.query?.address) ? req.query.address : null;
  const count = Math.min(Number(req.query?.limit) || 20, MAX_LIMIT);

  const board = await getLeaderboard(period, address, count);

  // Short cache: the board changes constantly but never needs to be
  // to-the-second, and this keeps a busy page off the store on every render.
  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');

  return res.status(200).json({
    ...board,
    points: POINTS,
    setupRequired: !isConfigured,
  });
}
