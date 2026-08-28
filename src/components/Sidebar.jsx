import { useAccount } from 'wagmi';
import { useI18n } from '../i18n/index.jsx';
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

export default function Sidebar({
  account,
  activeNav,
  onNavChange,
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  storageWarning,
  onCloseMenu,
}) {
  const { address, isConnected, chain } = useAccount();
  const { t } = useI18n();

  return (
    <aside className="sidebar">
      <div className="brand">
        <EddyMark className="brand-mark" />
        <div>
          <div className="brand-name">Eddy</div>
          <div className="brand-tag">Copilot for Nado</div>
        </div>
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
        <div className="account-card">
          <div className="account-row">
            <span className="wallet-addr">{truncateAddress(address)}</span>
            <span className="chain-pill">
              <span className="dot live" />
              {chain?.name ?? 'Unknown network'}
            </span>
          </div>
          <div>
            <div className="equity-label">Account equity</div>
            <div className="equity-figure">{account.equity}</div>
          </div>
          <div className="health-block">
            <div className="health-header">
              <span className="health-title">Margin health</span>
              <span className="health-value">{account.health}%</span>
            </div>
            <div className="health-track">
              <div className="health-fill" style={{ width: `${account.health}%` }} />
            </div>
          </div>
          <div className="positions-list">
            {account.positions.map((p) => (
              <div className="position-row" key={p.symbol}>
                <span className="position-name">
                  <span className={`side-tag ${p.side}`}>{p.side.toUpperCase()}</span>
                  {p.symbol}
                </span>
                <span className={`position-pnl ${p.pnl.startsWith('-') || p.pnl.startsWith('−') ? 'down' : 'up'}`}>
                  {p.pnl}
                </span>
              </div>
            ))}
          </div>
          <div className="account-demo-note">Sample data — Nado account sync isn't wired up yet.</div>
        </div>
      ) : (
        <div className="account-card account-card-empty">
          <p className="account-empty-text">Connect a wallet to see your positions, margin health, and account equity.</p>
        </div>
      )}

      <div className="sidebar-footer">
        Eddy reads your subaccount and Nado's docs to answer — it never signs or places trades on its own.
      </div>
    </aside>
  );
}
