import { useEffect, useRef } from 'react';
import { EddyAvatar, DocsIcon } from './icons.jsx';

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function SourceTag({ source }) {
  if (!source) return null;
  return (
    <div className="msg-source">
      {source.kind === 'live' ? <span className="src-live">●</span> : <DocsIcon />}
      {source.label}
    </div>
  );
}

function Bubble({ message }) {
  const isAi = message.role === 'ai';
  return (
    <div className={`msg from-${isAi ? 'ai' : 'user'}`}>
      {isAi && (
        <div className="msg-avatar">
          <EddyAvatar />
        </div>
      )}
      <div className="msg-body">
        <div className="bubble">
          {message.paragraphs.map((p, i) => (
            <p key={i}>{renderInline(p)}</p>
          ))}
          {message.stats && (
            <div className="mini-stat-row">
              {message.stats.map((s) => (
                <div className="mini-stat" key={s.label}>
                  <div className="mini-stat-label">{s.label}</div>
                  <div className="mini-stat-value">{s.value}</div>
                </div>
              ))}
            </div>
          )}
          {message.followUp && <p>{renderInline(message.followUp)}</p>}
        </div>
        {isAi && <SourceTag source={message.source} />}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="msg from-ai">
      <div className="msg-avatar">
        <EddyAvatar />
      </div>
      <div className="msg-body">
        <div className="bubble">
          <p style={{ color: 'var(--text-faint)' }}>thinking…</p>
        </div>
      </div>
    </div>
  );
}

export default function MessageThread({ messages, isTyping }) {
  const threadRef = useRef(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="thread" ref={threadRef}>
      <div className="thread-inner">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        {isTyping && <TypingBubble />}
      </div>
    </div>
  );
}
