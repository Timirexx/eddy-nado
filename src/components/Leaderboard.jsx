import { useState } from 'react';
import { useAccount } from 'wagmi';
import { PERIODS, useLeaderboard, localActivity } from '../useLeaderboard.js';
import { TrophyIcon, SparkIcon } from './icons.jsx';

const shorten = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * Deterministic avatar from the address, so the same wallet always gets the
 * same mark. Addresses are shown shortened; nothing else identifies a user.
 */
function Avatar({ address, size = 40 }) {
  const seed = parseInt(address.slice(2, 10), 16) || 0;
  const hue = seed % 360;
  const hue2 = (hue + 48) % 360;
  return (
    <span
      className="lb-avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 72% 52%), hsl(${hue2} 68% 38%))`,
      }}
      aria-hidden="true"
    >
      {address.slice(2, 4).toUpperCase()}
    </span>
  );
}

function Podium({ entries, youAddress }) {
  // Visual order puts 2nd, 1st, 3rd across the row so the winner is centre and
  // tallest; the DOM order stays 1-2-3 for screen readers.
  const order = [1, 0, 2];
  return (
    <ol className="lb-podium">
      {order.map((i) => {
        const e = entries[i];
        if (!e) return <li key={i} className="lb-podium-slot lb-podium-empty" />;
        const isYou = youAddress && e.address.toLowerCase() === youAddress.toLowerCase();
        return (
          <li
            key={e.address}
            className={`lb-podium-slot lb-place-${e.rank}${isYou ? ' is-you' : ''}`}
            style={{ order: order.indexOf(i) }}
          >
            <div className="lb-podium-rank">{e.rank}</div>
            <Avatar address={e.address} size={e.rank === 1 ? 56 : 46} />
            <div className="lb-podium-addr">{shorten(e.address)}</div>
            <div className="lb-podium-points">
              {e.points.toLocaleString()} <span>pts</span>
            </div>
            {isYou && <div className="lb-you-tag">You</div>}
          </li>
        );
      })}
    </ol>
  );
}

function YourStanding({ you, local, isConnected, configured }) {
  // Falls back to on-device activity when there is no ranked score to show —
  // either no wallet, or no shared store yet.
  const showLocal = !configured || !isConnected || !you || you.rank === null;

  return (
    <section className="lb-you">
      <header className="lb-you-head">
        <SparkIcon />
        <h3>Your activity</h3>
        {!showLocal && <span className="lb-you-rank">Rank #{you.rank}</span>}
      </header>

      <div className="lb-you-stats">
        <div className="lb-stat">
          <div className="lb-stat-value">
            {(showLocal ? local.points : you.points).toLocaleString()}
          </div>
          <div className="lb-stat-label">Points</div>
        </div>
        <div className="lb-stat">
          <div className="lb-stat-value">
            {(showLocal ? local.questions : you.questions).toLocaleString()}
          </div>
          <div className="lb-stat-label">Questions</div>
        </div>
        <div className="lb-stat">
          <div className="lb-stat-value">
            {(showLocal ? local.conversations : you.conversations).toLocaleString()}
          </div>
          <div className="lb-stat-label">Conversations</div>
        </div>
      </div>

      {showLocal && (
        <p className="lb-you-note">
          {!configured
            ? 'Counted on this device. Global ranking needs a datastore connected.'
            : !isConnected
              ? 'Counted on this device. Connect a wallet to be ranked.'
              : 'Ask Eddy something to join the ranking.'}
        </p>
      )}
    </section>
  );
}

export default function Leaderboard() {
  const [period, setPeriod] = useState('all');
  const { address, isConnected } = useAccount();
  const { status, data, error, reload } = useLeaderboard(period, address ?? null);
  const local = localActivity(readConversations());

  const entries = data?.entries ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const configured = Boolean(data?.configured);

  return (
    <div className="leaderboard">
      <header className="lb-header">
        <div className="lb-title">
          <TrophyIcon />
          <div>
            <h2>Leaderboard</h2>
            <p>Ranked by Eddy activity — questions asked and conversations started.</p>
          </div>
        </div>

        <div className="lb-tabs" role="tablist" aria-label="Leaderboard period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              className={`lb-tab${period === p.key ? ' active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <YourStanding
        you={data?.you}
        local={local}
        isConnected={isConnected}
        configured={configured}
      />

      {status === 'loading' && <div className="lb-message">Loading rankings…</div>}

      {status === 'error' && (
        <div className="lb-message lb-error">
          {error}
          <button type="button" className="lb-retry" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {status !== 'loading' && data && !configured && (
        <div className="lb-setup">
          <h3>Global rankings aren't switched on yet</h3>
          <p>
            Ranking people against each other needs storage every visitor shares, and this project
            has none connected. Create a KV store in the Vercel dashboard — the leaderboard reads{' '}
            <code>KV_REST_API_URL</code> and <code>KV_REST_API_TOKEN</code> automatically once they
            exist.
          </p>
          <p className="lb-setup-note">
            Your own activity above is real and counted locally. No sample players are shown here,
            because inventing wallet addresses would mean displaying fake people as real ones.
          </p>
        </div>
      )}

      {configured && entries.length === 0 && status === 'ready' && (
        <div className="lb-message">
          Nobody has scored in this period yet. Ask Eddy something to be first.
        </div>
      )}

      {configured && top3.length > 0 && (
        <>
          <Podium entries={top3} youAddress={address} />

          {rest.length > 0 && (
            <ol className="lb-list">
              {rest.map((e) => {
                const isYou = address && e.address.toLowerCase() === address.toLowerCase();
                return (
                  <li key={e.address} className={`lb-row${isYou ? ' is-you' : ''}`}>
                    <span className="lb-rank">{e.rank}</span>
                    <Avatar address={e.address} size={32} />
                    <span className="lb-addr">
                      {shorten(e.address)}
                      {isYou && <span className="lb-you-tag inline">You</span>}
                    </span>
                    <span className="lb-points">{e.points.toLocaleString()}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Anyone outside the visible slice still sees exactly where they sit. */}
          {data.you?.rank && data.you.rank > entries.length && (
            <ol className="lb-list lb-list-detached">
              <li className="lb-row is-you">
                <span className="lb-rank">{data.you.rank}</span>
                <Avatar address={data.you.address} size={32} />
                <span className="lb-addr">
                  {shorten(data.you.address)}
                  <span className="lb-you-tag inline">You</span>
                </span>
                <span className="lb-points">{data.you.points.toLocaleString()}</span>
              </li>
            </ol>
          )}

          {data.totalPlayers > 0 && (
            <p className="lb-total">{data.totalPlayers.toLocaleString()} ranked this period</p>
          )}
        </>
      )}
    </div>
  );
}

/** Same store the history feature uses; read defensively since it is user-writable. */
function readConversations() {
  try {
    const raw = localStorage.getItem('eddy.conversations.v1');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((c) => c && Array.isArray(c.messages))
      : [];
  } catch {
    return [];
  }
}
