import { EddyMark, MenuIcon, NewChatIcon } from './icons.jsx';
import WalletButton from './WalletButton.jsx';

/**
 * Phone-only header.
 *
 * On desktop the sidebar carries New Chat, History and the wallet panel. The
 * old mobile rule hid that sidebar outright, which removed those features on
 * phones rather than rearranging them. Here the menu button reopens the same
 * sidebar as a drawer, and New Chat is promoted into the header because it is
 * the one action worth reaching without opening anything.
 *
 * Hidden above the mobile breakpoint, so the desktop layout is untouched.
 */
export default function MobileHeader({ onOpenMenu, onNewChat, onLogoClick, historyCount }) {
  return (
    <header className="mobile-header">
      <button
        type="button"
        className="mobile-icon-btn"
        onClick={onOpenMenu}
        aria-label={`Open menu${historyCount ? ` — ${historyCount} saved chats` : ''}`}
      >
        <MenuIcon />
        {historyCount > 0 && <span className="mobile-badge">{historyCount}</span>}
      </button>

      <button type="button" className="mobile-brand" onClick={onLogoClick} aria-label="Go to home">
        <EddyMark className="mobile-brand-mark" />
        <span className="mobile-brand-name">Eddy</span>
      </button>

      <div className="mobile-header-actions">
        <button
          type="button"
          className="mobile-icon-btn"
          onClick={onNewChat}
          aria-label="Start a new chat"
        >
          <NewChatIcon />
        </button>
        <WalletButton compact />
      </div>
    </header>
  );
}
