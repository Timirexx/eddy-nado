import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import MessageThread from './components/MessageThread.jsx';
import ChipsRow from './components/ChipsRow.jsx';
import Composer from './components/Composer.jsx';
import { EddyMark } from './components/icons.jsx';
import { useChat } from './useChat.js';
import { useConversations } from './useConversations.js';
import { account, chips } from './data/conversation.js';

function EmptyState({ onPick, disabled }) {
  return (
    <div className="empty-state">
      <EddyMark className="empty-mark" />
      <h1 className="empty-title">Ask Eddy anything about Nado</h1>
      <p className="empty-sub">
        How the platform works, trading concepts, market structure, or a chart you paste in.
      </p>
      <ChipsRow chips={chips} onPick={onPick} disabled={disabled} />
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState('');
  const [activeNav, setActiveNav] = useState('chat');
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

  const { messages, threadId, error, send, stop, reset, hydrate, isStreaming } =
    useChat(activeId);

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

  function handleSend(text, images) {
    send(text ?? input, images ?? []);
    setInput('');
  }

  function handleNewChat() {
    setInput('');
    reset(startNew());
  }

  function handleSelectConversation(id) {
    if (id === activeId) return;
    setInput('');
    select(id);
  }

  return (
    <>
      <div className="atmosphere" aria-hidden="true" />
      <div className="app">
        <Sidebar
          account={account}
          activeNav={activeNav}
          onNavChange={setActiveNav}
          onNewChat={handleNewChat}
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
          <div className="disclaimer">
            Eddy explains Nado and trading concepts. It has no market data or account access, and
            doesn't give financial advice.
          </div>
        </div>
      </div>
    </>
  );
}
