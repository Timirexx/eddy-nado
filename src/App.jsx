import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import MessageThread from './components/MessageThread.jsx';
import ChipsRow from './components/ChipsRow.jsx';
import Composer from './components/Composer.jsx';
import { account, initialMessages, chips, cannedReplies } from './data/conversation.js';

let nextId = initialMessages.length + 1;

export default function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyIndex, setReplyIndex] = useState(2);
  const [activeNav, setActiveNav] = useState('chat');
  const [walletConnected, setWalletConnected] = useState(false);

  function handleSend(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isTyping) return;

    const userMessage = { id: `u${nextId++}`, role: 'user', paragraphs: [trimmed] };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    window.setTimeout(() => {
      const reply = cannedReplies[replyIndex % cannedReplies.length];
      setReplyIndex((i) => i + 1);
      setMessages((prev) => [...prev, { id: `a${nextId++}`, role: 'ai', ...reply }]);
      setIsTyping(false);
    }, 900);
  }

  function handleNewChat() {
    setMessages([]);
    setInput('');
    setIsTyping(false);
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
            title="Position review"
            subtitle="Today, 14:02"
            connected={walletConnected}
            onToggleConnect={() => setWalletConnected((c) => !c)}
          />
          <MessageThread messages={messages} isTyping={isTyping} />
          <ChipsRow chips={chips} onPick={handleSend} disabled={isTyping} />
          <Composer value={input} onChange={setInput} onSend={() => handleSend()} disabled={isTyping} />
          <div className="disclaimer">Eddy explains Nado and your account — it doesn't place trades or give financial advice.</div>
        </div>
      </div>
    </>
  );
}
