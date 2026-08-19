import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import MessageThread from './components/MessageThread.jsx';
import ChipsRow from './components/ChipsRow.jsx';
import Composer from './components/Composer.jsx';
import { EddyMark } from './components/icons.jsx';
import { useChat } from './useChat.js';
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
  const { messages, error, send, stop, reset, isStreaming } = useChat();

  function handleSend(text, images) {
    send(text ?? input, images ?? []);
    setInput('');
  }

  function handleNewChat() {
    reset();
    setInput('');
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
              <EmptyState
                onPick={(prompt) => handleSend(prompt, [])}
                disabled={isStreaming}
              />
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
