import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useI18n } from './i18n/index.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import MobileHeader from './components/MobileHeader.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Settings from './components/Settings.jsx';
import MessageThread from './components/MessageThread.jsx';
import ChipsRow from './components/ChipsRow.jsx';
import Composer from './components/Composer.jsx';
import { EddyMark } from './components/icons.jsx';
import { useChat } from './useChat.js';
import { useConversations } from './useConversations.js';
import { chips } from './data/conversation.js';

function EmptyState({ onPick, disabled }) {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <EddyMark className="empty-mark" />
      <h1 className="empty-title">{t('empty.title')}</h1>
      <p className="empty-sub">{t('empty.subtitle')}</p>
      <ChipsRow chips={chips} onPick={onPick} disabled={disabled} />
    </div>
  );
}

export default function App({ onGoHome }) {
  const [input, setInput] = useState('');
  const [activeNav, setActiveNav] = useState('chat');
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    conversations,
    activeId,
    storageWarning,
    syncMessages,
    startNew,
    select,
    remove,
    getMessages,
  } = useConversations();

  // The connected wallet is what leaderboard activity is credited to; with no
  // wallet the request carries no address and nothing is attributed.
  const { address } = useAccount();

  const { locale, t } = useI18n();

  const { messages, threadId, error, send, stop, reset, hydrate, isStreaming } =
    useChat(activeId, address ?? null, locale.promptName);

  // Opening a conversation from history: load its messages into the thread.
  // threadId comes from useChat and always travels with the messages, so the
  // persistence effect below cannot file one conversation's messages under
  // another's id while this catches up.
  useEffect(() => {
    if (threadId === activeId) return;
    hydrate(activeId, getMessages(activeId));
  }, [activeId, threadId, hydrate, getMessages]);

  useEffect(() => {
    syncMessages(threadId, messages.filter((m) => !m.pending || m.text));
  }, [messages, threadId, syncMessages]);

  // Escape closes the drawer, and body scroll is locked while it is open so
  // the page behind cannot scroll under the overlay on touch.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function handleSend(text, images) {
    send(text ?? input, images ?? []);
    setInput('');
  }

  function handleNewChat() {
    setInput('');
    reset(startNew());
    setMenuOpen(false);
  }

  function handleSelectConversation(id) {
    setMenuOpen(false);
    if (id === activeId) return;
    setInput('');
    select(id);
  }

  return (
    <>
      <div className="atmosphere" aria-hidden="true" />
      <div className={`app${menuOpen ? ' menu-open' : ''}`}>
        <MobileHeader
          onOpenMenu={() => setMenuOpen(true)}
          onNewChat={handleNewChat}
          onLogoClick={onGoHome}
          historyCount={conversations.length}
        />
        {/* Only rendered while open, so it can never swallow taps on desktop
            or sit in the tab order when hidden. */}
        {menuOpen && (
          <button
            type="button"
            className="mobile-scrim"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <Sidebar
          activeNav={activeNav}
          onNavChange={(key) => {
            setActiveNav(key);
            // On mobile the nav lives in the drawer, so choosing a section
            // should reveal it rather than leave the drawer covering it.
            setMenuOpen(false);
          }}
          onNewChat={handleNewChat}
          onCloseMenu={() => setMenuOpen(false)}
          onLogoClick={onGoHome}
          conversations={conversations}
          activeConversationId={activeId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={remove}
          storageWarning={storageWarning}
        />
        <div className="main">
          <TopBar
            title="Eddy"
            subtitle={isStreaming ? 'Thinking…' : 'Trading assistant for Nado'}
          />
          {activeNav === 'leaderboard' ? (
            <div className="panel-scroll">
              <Leaderboard />
            </div>
          ) : activeNav === 'settings' ? (
            <div className="panel-scroll">
              <Settings onOpenLibrary={() => setActiveNav('history')} />
            </div>
          ) : (
            <>
              <MessageThread
                messages={messages}
                error={error}
                emptyState={
                  <EmptyState onPick={(prompt) => handleSend(prompt, [])} disabled={isStreaming} />
                }
              />
              <Composer
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onStop={stop}
                isStreaming={isStreaming}
              />
              <div className="disclaimer">{t('disclaimer')}</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
