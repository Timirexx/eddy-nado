import { useAccount } from 'wagmi';
import HistoryList from './HistoryList.jsx';
import {
  EddyMark,
  ChatIcon,
  HistoryIcon,
  WatchingIcon,
  SettingsIcon,
  NewChatIcon,
} from './icons.jsx';

const NAV_ITEMS = [
  { key: 'chat', label: 'Chat', icon: ChatIcon },
  { key: 'history', label: 'History', icon: HistoryIcon },
  { key: 'watching', label: 'Watching', icon: WatchingIcon },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
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
}) {
  const { address, isConnected, chain } = useAccount();

  return (
    <aside className="sidebar">
      <div className="brand">
        <EddyMark className="brand-mark" />
        <div>
          <div className="brand-name">Eddy</div>
          <div className="brand-tag">Copilot for Nado</div>
        </div>
      </div>

      <button className="new-chat" type="button" onClick={onNewChat}>
        <NewChatIcon />
        New chat
      </button>

      <nav className="primary-nav" aria-label="Primary">
        {NAV_ITEMS.map(({ key, label, icon: ItemIcon }) => (
          <button
            key={key}
            type="button"
            className={`nav-item${activeNav === key ? ' active' : ''}`}
            onClick={() => onNavChange(key)}
          >
            <ItemIcon />
            {label}
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
