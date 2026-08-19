import { useRef, useState } from 'react';
import { SendIcon, StopIcon, AttachIcon, CloseIcon } from './icons.jsx';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export default function Composer({ value, onChange, onSend, onStop, isStreaming }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [attachError, setAttachError] = useState(null);
  const [isDragging, setDragging] = useState(false);

  const canSend = (value.trim() || images.length > 0) && !isStreaming;

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function handleInput(e) {
    onChange(e.target.value);
    resize();
  }

  async function addFiles(files) {
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;

    setAttachError(null);
    const accepted = [];

    for (const file of incoming) {
      if (images.length + accepted.length >= MAX_IMAGES) {
        setAttachError(`You can attach up to ${MAX_IMAGES} images per message.`);
        break;
      }
      if (!ALLOWED.includes(file.type)) {
        setAttachError('Images must be PNG, JPEG, GIF, or WebP.');
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setAttachError(`"${file.name || 'Image'}" is over the 5MB limit.`);
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name || 'pasted image',
        dataUrl: await readAsDataUrl(file),
      });
    }

    if (accepted.length) setImages((prev) => [...prev, ...accepted]);
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setAttachError(null);
  }

  function submit() {
    if (!canSend) return;
    onSend(value, images.map((img) => img.dataUrl));
    setImages([]);
    setAttachError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  // Screenshots usually arrive via the clipboard, so paste is the primary path
  // for the chart-and-position use case rather than the file picker.
  function handlePaste(e) {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  }

  return (
    <div
      className={`composer-wrap${isDragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      {images.length > 0 && (
        <div className="attachments">
          {images.map((img) => (
            <div className="attachment" key={img.id}>
              <img src={img.dataUrl} alt={img.name} />
              <button
                type="button"
                className="attachment-remove"
                aria-label={`Remove ${img.name}`}
                onClick={() => removeImage(img.id)}
              >
                <CloseIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {attachError && <div className="attach-error">{attachError}</div>}

      <div className="composer">
        <button
          type="button"
          className="attach-btn"
          aria-label="Attach an image"
          onClick={() => fileInputRef.current?.click()}
        >
          <AttachIcon />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED.join(',')}
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask about Nado, a trading idea, or paste a chart…"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        {isStreaming ? (
          <button className="send-btn stop" type="button" aria-label="Stop generating" onClick={onStop}>
            <StopIcon />
          </button>
        ) : (
          <button
            className="send-btn"
            type="button"
            aria-label="Send message"
            disabled={!canSend}
            onClick={submit}
          >
            <SendIcon />
          </button>
        )}
      </div>
    </div>
  );
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
