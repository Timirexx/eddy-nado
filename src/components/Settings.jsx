import { useCallback, useMemo, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useTheme } from '../useTheme.js';
import {
  libraryStats,
  storageUsage,
  formatBytes,
  exportConversations,
  clearConversations,
} from '../storageInfo.js';
import {
  SettingsIcon,
  HistoryIcon,
  WalletIcon,
  TrashIcon,
  DocsIcon,
  SparkIcon,
  CloseIcon,
} from './icons.jsx';

const REPO = 'https://github.com/Timirexx/eddy-nado';
const NADO_DOCS = 'https://docs.nado.xyz';
const APP_VERSION = '0.1.0';

const shorten = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function Section({ title, children }) {
  return (
    <section className="set-section">
      <h3 className="set-section-title">{title}</h3>
      <div className="set-card">{children}</div>
    </section>
  );
}

/** One row. Renders as a button when it does something, a div when it's just information. */
function Row({ icon: Icon, label, description, value, onClick, href, danger, children }) {
  const content = (
    <>
      {Icon && (
        <span className="set-row-icon">
          <Icon />
        </span>
      )}
      <span className="set-row-body">
        <span className="set-row-label">{label}</span>
        {description && <span className="set-row-desc">{description}</span>}
      </span>
      {children}
      {value && <span className="set-row-value">{value}</span>}
      {(onClick || href) && !children && <span className="set-row-chevron" aria-hidden="true">›</span>}
    </>
  );

  const className = `set-row${danger ? ' danger' : ''}${onClick || href ? ' actionable' : ''}`;

  if (href) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

export default function Settings({ onOpenLibrary }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { theme, setTheme } = useTheme();

  // Re-read on demand so figures update after clearing or exporting rather
  // than showing a stale snapshot from mount.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  const library = useMemo(() => libraryStats(), [refreshKey]);
  const usage = useMemo(() => storageUsage(), [refreshKey]);

  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState(null);

  const say = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const usedPercent = usage.quota ? Math.min(100, (usage.totalBytes / usage.quota) * 100) : 0;

  const issueUrl = useMemo(() => {
    const body = [
      '### What happened?',
      '',
      '',
      '### What did you expect?',
      '',
      '',
      '---',
      `App version: ${APP_VERSION}`,
      `Page: ${typeof window !== 'undefined' ? window.location.pathname : ''}`,
      `Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
      `Theme: ${theme}`,
    ].join('\n');
    return `${REPO}/issues/new?title=${encodeURIComponent('[Bug] ')}&body=${encodeURIComponent(body)}`;
  }, [theme]);

  return (
    <div className="settings">
      <header className="set-header">
        <SettingsIcon />
        <div>
          <h2>Settings</h2>
          <p>Your profile, how Eddy looks and behaves, and where to get help.</p>
        </div>
      </header>

      {/* ---------------- Profile ---------------- */}
      <Section title="Profile">
        {isConnected && address ? (
          <>
            <div className="set-row">
              <span className="set-profile-avatar">{address.slice(2, 4).toUpperCase()}</span>
              <span className="set-row-body">
                <span className="set-row-label">{shorten(address)}</span>
                <span className="set-row-desc">Connected wallet — your identity on the leaderboard</span>
              </span>
            </div>
            <Row
              icon={WalletIcon}
              label="Disconnect wallet"
              description="Eddy keeps working; you just won't be ranked"
              onClick={() => {
                disconnect();
                say('Wallet disconnected.');
              }}
            />
          </>
        ) : (
          <Row
            icon={WalletIcon}
            label="Connect a wallet"
            description="Needed to appear on the leaderboard. Eddy works without one."
            onClick={openConnectModal}
          />
        )}

        <Row
          icon={HistoryIcon}
          label="Library"
          description={
            library.conversations === 0
              ? 'No saved conversations yet'
              : `${library.conversations} conversation${library.conversations === 1 ? '' : 's'} · ${library.questions} question${library.questions === 1 ? '' : 's'}`
          }
          onClick={onOpenLibrary}
        />
      </Section>

      {/* ---------------- Personalization ---------------- */}
      <Section title="Personalization">
        <div className="set-row">
          <span className="set-row-icon">
            <SparkIcon />
          </span>
          <span className="set-row-body">
            <span className="set-row-label">Theme</span>
            <span className="set-row-desc">System follows your device setting</span>
          </span>
          <div className="set-segmented" role="radiogroup" aria-label="Theme">
            {[
              { key: 'light', label: 'Light' },
              { key: 'dark', label: 'Dark' },
              { key: 'system', label: 'System' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={theme === opt.key}
                className={`set-seg${theme === opt.key ? ' active' : ''}`}
                onClick={() => setTheme(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="set-row">
          <span className="set-row-icon">
            <DocsIcon />
          </span>
          <span className="set-row-body">
            <span className="set-row-label">App language</span>
            <span className="set-row-desc">
              English only for now — Eddy still answers in whatever language you write in
            </span>
          </span>
          <select className="set-select" value="en" disabled aria-label="App language">
            <option value="en">English</option>
          </select>
        </div>

        <div className="set-row set-storage">
          <span className="set-row-body">
            <span className="set-row-label">Storage</span>
            <span className="set-row-desc">
              {usage.available
                ? `${formatBytes(usage.totalBytes)} of about ${formatBytes(usage.quota)} used on this device`
                : 'Unavailable — site data is blocked in this browser'}
            </span>
            {usage.available && (
              <>
                <span className="set-meter" aria-hidden="true">
                  <span className="set-meter-fill" style={{ width: `${usedPercent}%` }} />
                </span>
                <span className="set-storage-split">
                  Conversations {formatBytes(usage.conversationBytes)} · Wallet and other{' '}
                  {formatBytes(usage.otherBytes)}
                </span>
              </>
            )}
          </span>
        </div>

        <Row
          icon={DocsIcon}
          label="Export conversations"
          description="Download everything as JSON — history lives only on this device"
          onClick={() => {
            const n = exportConversations();
            say(n === 0 ? 'Nothing to export yet.' : `Exported ${n} conversation${n === 1 ? '' : 's'}.`);
          }}
        />

        {confirmClear ? (
          <div className="set-row set-confirm">
            <span className="set-row-body">
              <span className="set-row-label">Delete every saved conversation?</span>
              <span className="set-row-desc">This cannot be undone. Export first if you want a copy.</span>
            </span>
            <div className="set-confirm-actions">
              <button
                type="button"
                className="set-btn danger"
                onClick={() => {
                  clearConversations();
                  setConfirmClear(false);
                  refresh();
                  say('All conversations deleted.');
                }}
              >
                Delete all
              </button>
              <button type="button" className="set-btn" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <Row
            icon={TrashIcon}
            label="Clear conversation history"
            description="Removes every saved chat from this device"
            danger
            onClick={() => setConfirmClear(true)}
          />
        )}
      </Section>

      {/* ---------------- Support ---------------- */}
      <Section title="Support">
        <Row
          icon={CloseIcon}
          label="Report an app issue"
          description="Opens GitHub with your version and browser already filled in"
          href={issueUrl}
        />
        <Row
          icon={DocsIcon}
          label="Help centre"
          description="Nado's official documentation — the source Eddy answers from"
          href={NADO_DOCS}
        />
        <Row
          icon={SparkIcon}
          label="What Eddy can and can't do"
          description="Explains Nado and trading concepts. No market data, no account access, no financial advice."
        />
      </Section>

      <Section title="About">
        <Row label="Version" value={APP_VERSION} />
        <Row label="Assistant model" value="Claude Opus 5" />
        <Row label="Network" value="Ink · chain 57073" />
        <Row
          icon={DocsIcon}
          label="Source code"
          description="Open source on GitHub"
          href={REPO}
        />
      </Section>

      {toast && <div className="set-toast" role="status">{toast}</div>}
    </div>
  );
}
