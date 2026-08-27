import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EddyAvatar } from './icons.jsx';

/**
 * react-markdown escapes raw HTML by default, so model output cannot inject
 * markup into the page. Links are the one live element, and they get
 * noopener/noreferrer plus an explicit target.
 */
const MARKDOWN_COMPONENTS = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  table: ({ node, ...props }) => (
    <div className="table-scroll">
      <table {...props} />
    </div>
  ),
};

function Bubble({ message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`msg from-${isAssistant ? 'ai' : 'user'}`}>
      {isAssistant && (
        <div className="msg-avatar">
          <EddyAvatar />
        </div>
      )}
      <div className="msg-body">
        {message.images?.length > 0 && (
          <div className="msg-images">
            {message.images.map((src, i) => (
              <img key={i} src={src} alt="" className="msg-image" />
            ))}
          </div>
        )}

        {/* Images are dropped from stored history when localStorage fills up.
            Saying so beats a message that silently lost its chart. */}
        {!message.images?.length && message.shedImageCount > 0 && (
          <div className="msg-note">
            {message.shedImageCount === 1 ? 'Image was' : `${message.shedImageCount} images were`}{' '}
            cleared to free up storage.
          </div>
        )}

        {(message.text || message.pending) && (
          <div className="bubble">
            {message.pending && !message.text ? (
              <ThinkingDots />
            ) : (
              <div className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                  {message.text}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {message.truncated && (
          <div className="msg-note">Cut off at the length limit — ask me to continue.</div>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="thinking" aria-label="Eddy is thinking">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function MessageThread({ messages, error, emptyState }) {
  const threadRef = useRef(null);
  const [pinned, setPinned] = useState(true);

  // Follow the stream only while the reader is already at the bottom, so
  // scrolling up to re-read something isn't yanked back down by each delta.
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setPinned(distance < 80);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el && pinned) el.scrollTop = el.scrollHeight;
  }, [messages, error, pinned]);

  const isEmpty = messages.length === 0;

  return (
    <div className="thread" ref={threadRef}>
      <div className="thread-inner">
        {isEmpty && emptyState}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        {error && <div className="thread-error">{error}</div>}
      </div>
    </div>
  );
}
