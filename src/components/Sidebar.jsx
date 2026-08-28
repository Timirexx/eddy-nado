import { useAccount } from 'wagmi';
import { useI18n } from '../i18n/index.jsx';
import { useNadoAccount, riskBand, formatUsd } from '../useNadoAccount.js';
import HistoryList from './HistoryList.jsx';
import {
  EddyMark,
  ChatIcon,
  HistoryIcon,
  WatchingIcon,
  SettingsIcon,
  NewChatIcon,
  CloseIcon,
  TrophyIcon,
} from './icons.jsx';

const NAV_ITEMS = [
  { key: 'chat', labelKey: 'nav.chat', icon: ChatIcon },
  { key: 'history', labelKey: 'nav.history', icon: HistoryIcon },
  { key: 'leaderboard', labelKey: 'nav.leaderboard', icon: TrophyIcon },
  { key: 'watching', labelKey: 'nav.watching', icon: WatchingIcon },
  { key: 'settings', labelKey: 'nav.settings', icon: SettingsIcon },
];

function truncateAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Live Nado subaccount summary. Every figure here comes from the gateway; there
 * is no placeholder path, so an unavailable state says so rather than showing a
 * number that isn't the user's.
 */
function AccountCard({ address, chainName }) {
  const { status, data, error } = useNadoAccount(address);

  const header = (
    <div className="account-row">
      <span className="wallet-addr">{truncateAddress(address)}</span>
      <span className="chain-pill">
        <span className="dot live" />
        {chainName ?? 'Unknown network'}
      </span>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="account-card">
        {header}
        <div className="account-note">Loading your Nado account…</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="account-card">
        {header}
        <div className="account-note account-note-error">{error}</div>
      </div>
    );
  }

  if (status === 'ready' && !data.exists) {
    return (
      <div className="account-card">
        {header}
        <div className="account-note">
          No Nado account for this wallet yet. Deposit at least $5 USDT0 on Ink to open one.
        </div>
      </div>
    );
  }

  if (status !== 'ready') {
    return (
      <div className="account-card">
        {header}
      </div>
    );
  }

  const usage = data.marginUsage ?? 0;
  const band = riskBand(usage);

  return (
    <div className="account-card">
      {header}

      <div>
        <div className="equity-label">Account equity</div>
        <div className="equity-figure">{formatUsd(data.equity)}</div>
      </div>

      {/* Nado's own metric, not an invented "health" score: usage rises toward
          100%, and 100% is the point liquidation becomes possible. */}
      <div className="health-block">
        <div className="health-header">
          <span className="health-title">Maintenance margin</span>
          <span className={`health-value risk-${band.key}`}>{usage.toFixed(1)}%</span>
        </div>
        <div className="health-track">
          <div className={`health-fill risk-${band.key}`} style={{ width: `${Math.max(usage, 1.5)}%` }} />
        </div>
        <div className="health-band">{band.label}</div>
      </div>

      {data.positions.length > 0 ? (
        <div className="positions-list">
          {data.positions.map((p) => (
            <div className="position-row" key={p.productId}>
              <span className="position-name">
                <span className={`side-tag ${p.side}`}>{p.side.toUpperCase()}</span>
                {p.symbol}
              </span>
              <span className={`position-pnl ${p.pnl < 0 ? 'down' : 'up'}`}>
                {formatUsd(p.pnl, { sign: true })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="account-note">No open perp positions.</div>
      )}
    </div>
  );
}

export default function Sidebar({
  activeNav,
  onNavChange,
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  storageWarning,
  onCloseMenu,
  onLogoClick,
}) {
  const { address, isConnected, chain } = useAccount();
  const { t } = useI18n();

  return (
    <aside className="sidebar">
      <div className="brand">
        <button type="button" className="brand-link" onClick={onLogoClick} aria-label="Go to home">
          <EddyMark className="brand-mark" />
          <div>
            <div className="brand-name">Eddy</div>
            <div className="brand-tag">Copilot for Nado</div>
          </div>
        </button>
        {/* Phone-only: the drawer needs a close affordance inside itself, since
            the scrim alone isn't discoverable. Hidden on desktop. */}
        <button
          type="button"
          className="drawer-close"
          onClick={onCloseMenu}
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>
      </div>

      <button className="new-chat" type="button" onClick={onNewChat}>
        <NewChatIcon />
        {t('action.newChat')}
      </button>

      <nav className="primary-nav" aria-label="Primary">
        {NAV_ITEMS.map(({ key, labelKey, icon: ItemIcon }) => (
          <button
            key={key}
            type="button"
            className={`nav-item${activeNav === key ? ' active' : ''}`}
            onClick={() => onNavChange(key)}
          >
            <ItemIcon />
            {t(labelKey)}
          </button>
        ))}
      </nav>

      {activeNav === 'history' && (
        <div className="history-panel">
          <div className="sidebar-label">
            Chat history
            {conversations.length > 0 && (
              <span className="history-count">{conversations.length}</span>
            )}
          </div>
          {storageWarning && <div className="history-warning">{storageWarning}</div>}
          <HistoryList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={onSelectConversation}
            onDelete={onDeleteConversation}
          />
        </div>
      )}

      <div className="sidebar-label">Your account</div>

      {isConnected && address ? (
        <AccountCard address={address} chainName={chain?.name} />
      ) : (
        <div className="account-card account-card-empty">
          <p className="account-empty-text">
            Connect a wallet to see your live Nado positions, margin usage, and account equity.
          </p>
        </div>
      )}

      <div className="sidebar-footer">
        Eddy answers from Nado's documentation — it never signs or places trades on its own.
      </div>
    </aside>
  );
}
