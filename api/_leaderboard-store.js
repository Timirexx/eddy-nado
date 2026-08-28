/**
 * Leaderboard storage.
 *
 * Ranking users against one another needs storage every visitor shares, so
 * unlike chat history (which is per-browser localStorage) this has to be
 * server-side. It runs on Redis sorted sets via the same Upstash-compatible
 * REST API the rate limiter already uses, so connecting a Vercel KV store
 * lights it up with no code change and no npm dependency.
 *
 * Sorted sets are the right primitive here: ZINCRBY to award points, ZREVRANGE
 * for the top N, and ZREVRANK for one member's position — all O(log N), so a
 * user's rank never requires scanning the table.
 *
 * With no store configured every read returns `configured: false` and the UI
 * says so. It deliberately does not invent competitors: a leaderboard filled
 * with plausible-looking wallet addresses would be fabricated records shown as
 * real people.
 */

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export const isConfigured = Boolean(KV_URL && KV_TOKEN);

// Points. Starting a conversation is worth more than another message inside
// one, so depth of use beats spamming a single thread.
export const POINTS = { question: 1, conversation: 5 };

const TTL = {
  day: 60 * 60 * 24 * 9,
  week: 60 * 60 * 24 * 40,
  month: 60 * 60 * 24 * 400,
  all: null,
};

export function periodKeys(now = new Date()) {
  return {
    day: `eddy:lb:d:${isoDate(now)}`,
    week: `eddy:lb:w:${isoWeek(now)}`,
    month: `eddy:lb:m:${now.toISOString().slice(0, 7)}`,
    all: 'eddy:lb:all',
  };
}

const isoDate = (d) => d.toISOString().slice(0, 10);

/** ISO-8601 week, so a week rolls over Monday rather than on an arbitrary offset. */
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday of the current week determines the year the week belongs to.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function pipeline(commands) {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`leaderboard store returned ${res.status}`);
  return res.json();
}

/**
 * Awards points to an address across every period at once.
 * Never throws: losing a leaderboard increment must not fail a chat reply.
 */
export async function recordActivity(address, { questions = 0, conversations = 0 } = {}) {
  if (!isConfigured || !address) return { recorded: false };

  const points = questions * POINTS.question + conversations * POINTS.conversation;
  if (points <= 0) return { recorded: false };

  const member = address.toLowerCase();
  const keys = periodKeys();
  const commands = [];

  for (const [period, key] of Object.entries(keys)) {
    commands.push(['ZINCRBY', key, String(points), member]);
    // EXPIRE ... NX only sets a TTL when the key has none, so the window is
    // anchored to the period's first write rather than sliding on every write.
    if (TTL[period]) commands.push(['EXPIRE', key, String(TTL[period]), 'NX']);
  }

  // Raw counters, so the UI can show activity rather than only a points total.
  commands.push(['HINCRBY', `eddy:stats:${member}`, 'questions', String(questions)]);
  commands.push(['HINCRBY', `eddy:stats:${member}`, 'conversations', String(conversations)]);
  commands.push(['SADD', 'eddy:lb:members', member]);

  try {
    await pipeline(commands);
    return { recorded: true, points };
  } catch (err) {
    console.error('[eddy] leaderboard write failed:', err.message);
    return { recorded: false };
  }
}

/**
 * Top entries for a period, plus the caller's own standing — which is fetched
 * explicitly rather than searched for in the top slice, so someone ranked
 * 4,000th still sees their exact position.
 */
export async function getLeaderboard(period = 'all', address = null, limit = 20) {
  if (!isConfigured) {
    return { configured: false, period, entries: [], you: null, totalPlayers: 0 };
  }

  const key = periodKeys()[period] ?? periodKeys().all;
  const member = address ? address.toLowerCase() : null;

  const commands = [
    ['ZREVRANGE', key, '0', String(limit - 1), 'WITHSCORES'],
    ['ZCARD', key],
  ];
  if (member) {
    commands.push(['ZREVRANK', key, member]);
    commands.push(['ZSCORE', key, member]);
    commands.push(['HGETALL', `eddy:stats:${member}`]);
  }

  let results;
  try {
    results = await pipeline(commands);
  } catch (err) {
    console.error('[eddy] leaderboard read failed:', err.message);
    return { configured: true, unavailable: true, period, entries: [], you: null, totalPlayers: 0 };
  }

  const flat = results[0]?.result ?? [];
  const entries = [];
  for (let i = 0; i < flat.length; i += 2) {
    entries.push({
      address: flat[i],
      points: Number(flat[i + 1]) || 0,
      rank: entries.length + 1,
    });
  }

  const totalPlayers = Number(results[1]?.result) || 0;

  let you = null;
  if (member) {
    const rank = results[2]?.result;
    const score = results[3]?.result;
    const stats = toObject(results[4]?.result);
    you = {
      address: member,
      // ZREVRANK is 0-based and null when the member is absent.
      rank: rank === null || rank === undefined ? null : Number(rank) + 1,
      points: score === null || score === undefined ? 0 : Number(score),
      questions: Number(stats.questions) || 0,
      conversations: Number(stats.conversations) || 0,
    };
  }

  return { configured: true, period, entries, you, totalPlayers };
}

/** HGETALL comes back as a flat [field, value, ...] array over REST. */
function toObject(flat) {
  if (!Array.isArray(flat)) return flat && typeof flat === 'object' ? flat : {};
  const out = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}
