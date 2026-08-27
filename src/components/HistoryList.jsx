import { useState } from 'react';
import { TrashIcon, ImageIcon } from './icons.jsx';

function relativeTime(ts) {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HistoryList({ conversations, activeId, onSelect, onDelete }) {
  const [confirmingId, setConfirmingId] = useState(null);

  if (conversations.length === 0) {
    return (
      <p className="history-empty">
        Your chats appear here once you send a message.
      </p>
    );
  }

  return (
    <ul className="history-list">
      {conversations.map((c) => {
        const isConfirming = confirmingId === c.id;
        const imageCount = c.messages.reduce(
          (n, m) => n + (m.images?.length || 0) + (m.shedImageCount || 0),
          0,
        );

        return (
          <li key={c.id}>
            <div className={`history-item${c.id === activeId ? ' active' : ''}`}>
              <button
                type="button"
                className="history-open"
                onClick={() => onSelect(c.id)}
                title={c.title}
              >
                <span className="history-title">{c.title}</span>
                <span className="history-meta">
                  {relativeTime(c.updatedAt)}
                  <span className="history-dot">·</span>
                  {c.messages.length} {c.messages.length === 1 ? 'message' : 'messages'}
                  {imageCount > 0 && (
                    <>
                      <span className="history-dot">·</span>
                      <ImageIcon />
                      {imageCount}
                    </>
                  )}
                </span>
              </button>

              {isConfirming ? (
                <div className="history-confirm">
                  <button
                    type="button"
                    className="history-confirm-yes"
                    onClick={() => {
                      onDelete(c.id);
                      setConfirmingId(null);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="history-confirm-no"
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="history-delete"
                  aria-label={`Delete "${c.title}"`}
                  onClick={() => setConfirmingId(c.id)}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
