import { checkRateLimit } from './_rate-limit.js';

/**
 * Live Nado account state for a wallet address.
 *
 * Reads the public gateway — no key, no signature, read-only. Runs server-side
 * rather than from the browser so the response can be cached briefly and the
 * fixed-point maths lives in one place instead of being repeated in the UI.
 *
 * Everything the gateway returns is x18 fixed point (18 decimals) as a decimal
 * string, including negatives.
 */

const GATEWAY = 'https://gateway.prod.nado.xyz/v1/query';

// A subaccount id is the 20-byte owner address followed by a 12-byte name.
// "default" is the subaccount the app creates on first deposit.
const DEFAULT_SUBACCOUNT_NAME = 'default';

const isAddress = (v) => typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);

function toSubaccountHex(address, name = DEFAULT_SUBACCOUNT_NAME) {
  const nameHex = Buffer.from(name, 'utf8').toString('hex').padEnd(24, '0');
  if (nameHex.length > 24) throw new Error('Subaccount name is too long.');
  return `${address.toLowerCase()}${nameHex}`;
}

/**
 * x18 string to a JS number. Done via BigInt on the integer part so a large
 * balance cannot lose precision before the divide, which plain Number(str)
 * would do above 2^53.
 */
function fromX18(value) {
  if (value === null || value === undefined) return 0;
  const s = String(value);
  if (!/^-?\d+$/.test(s)) return Number(s) / 1e18 || 0;
  const negative = s.startsWith('-');
  const digits = negative ? s.slice(1) : s;
  const padded = digits.padStart(19, '0');
  const whole = padded.slice(0, -18);
  const frac = padded.slice(-18);
  const n = Number(`${whole}.${frac}`);
  return negative ? -n : n;
}

async function gatewayQuery(params) {
  const url = `${GATEWAY}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    // The gateway rejects requests that don't advertise compression support.
    headers: { 'accept-encoding': 'gzip, deflate, br', accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nado gateway returned ${res.status}`);
  const body = await res.json();
  if (body.status !== 'success') throw new Error(body.reason || 'Nado gateway rejected the query');
  return body.data;
}

// product_id -> symbol. Static enough to hold across invocations on a warm
// instance rather than re-fetching a few hundred products per request.
let symbolCache = { at: 0, byProductId: null };
const SYMBOL_TTL = 10 * 60 * 1000;

async function getSymbols() {
  if (symbolCache.byProductId && Date.now() - symbolCache.at < SYMBOL_TTL) {
    return symbolCache.byProductId;
  }
  const data = await gatewayQuery({ type: 'symbols' });
  const byProductId = new Map();
  for (const entry of Object.values(data?.symbols ?? {})) {
    if (entry && typeof entry.product_id === 'number') {
      byProductId.set(entry.product_id, { symbol: entry.symbol, type: entry.type });
    }
  }
  symbolCache = { at: Date.now(), byProductId };
  return byProductId;
}

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

  const address = req.query?.address;
  if (!isAddress(address)) {
    return res.status(400).json({ error: 'A valid 0x wallet address is required.' });
  }
  const name = typeof req.query?.subaccount === 'string' ? req.query.subaccount : DEFAULT_SUBACCOUNT_NAME;

  try {
    const subaccount = toSubaccountHex(address, name);
    const [info, symbols] = await Promise.all([
      gatewayQuery({ type: 'subaccount_info', subaccount }),
      getSymbols(),
    ]);

    if (!info?.exists) {
      // A wallet with no Nado account is a normal state, not an error: nothing
      // has been deposited yet.
      return json(res, {
        address,
        subaccountName: name,
        exists: false,
        equity: 0,
        positions: [],
      });
    }

    // healths is [initial, maintenance, unweighted].
    const maintenance = info.healths?.[1] ?? {};
    const unweighted = info.healths?.[2] ?? {};

    // Unweighted health applies no risk weighting, so it is the account's
    // actual net value — assets minus liabilities.
    const equity = fromX18(unweighted.health);

    // Maintenance margin usage, as the docs define it: the share of maintenance
    // margin consumed. Liabilities equal to assets means maintenance health is
    // zero, which is exactly the point liquidation becomes possible — so the
    // ratio hits 100% precisely where the docs say it should.
    const mAssets = fromX18(maintenance.assets);
    const mLiabilities = fromX18(maintenance.liabilities);
    const marginUsage = mAssets > 0 ? Math.min(100, (mLiabilities / mAssets) * 100) : 0;

    // Oracle price per perp product, for marking positions.
    const perpPrice = new Map();
    for (const p of info.perp_products ?? []) {
      perpPrice.set(p.product_id, fromX18(p.oracle_price_x18));
    }

    const positions = (info.perp_balances ?? [])
      .map((p) => {
        const size = fromX18(p.balance?.amount);
        if (size === 0) return null;
        const price = perpPrice.get(p.product_id) ?? 0;
        const vQuote = fromX18(p.balance?.v_quote_balance);
        return {
          productId: p.product_id,
          symbol: symbols.get(p.product_id)?.symbol ?? `#${p.product_id}`,
          side: size > 0 ? 'long' : 'short',
          size: Math.abs(size),
          markPrice: price,
          notional: Math.abs(size) * price,
          // Buying 1 unit at P sets v_quote to -P, so size*price + v_quote is
          // zero at entry and moves with the mark — the unrealised PnL.
          // Excludes funding accrued since the last hourly settlement.
          pnl: size * price + vQuote,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.notional - a.notional);

    const spot = (info.spot_balances ?? [])
      .map((b) => {
        const amount = fromX18(b.balance?.amount);
        if (amount === 0) return null;
        return { productId: b.product_id, symbol: symbols.get(b.product_id)?.symbol ?? `#${b.product_id}`, amount };
      })
      .filter(Boolean);

    return json(res, {
      address,
      subaccountName: name,
      exists: true,
      equity,
      marginUsage,
      maintenanceAssets: mAssets,
      maintenanceLiabilities: mLiabilities,
      positions,
      spot,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[eddy] account lookup failed:', err.message);
    return res.status(502).json({
      error: 'Could not reach Nado right now. Your positions are unavailable — try again shortly.',
    });
  }
}

function json(res, payload) {
  // Short cache: balances move constantly, but this keeps a re-render or a
  // second tab off the gateway on every paint.
  res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
  return res.status(200).json(payload);
}
