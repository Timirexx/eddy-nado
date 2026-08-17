import { useRef } from 'react';
import { SendIcon } from './icons.jsx';

export default function Composer({ value, onChange, onSend, disabled }) {
  const textareaRef = useRef(null);

  function handleInput(e) {
    onChange(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask Eddy about your account, a market, or how Nado works…"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
        />
        <button
          className="send-btn"
          type="button"
          aria-label="Send message"
          disabled={disabled || !value.trim()}
          onClick={onSend}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
