import { useEffect, useRef, useState } from 'react';
import { SendIcon, StopIcon, AttachIcon, CloseIcon, MicIcon } from './icons.jsx';
import { useSpeechToText, SPEECH_TO_TEXT_SUPPORTED } from '../useSpeechToText.js';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export default function Composer({ value, onChange, onSend, onStop, isStreaming }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [attachError, setAttachError] = useState(null);
  const [isDragging, setDragging] = useState(false);

  const speech = useSpeechToText();
  const listening = speech.state === 'listening';

  const canSend = (value.trim() || images.length > 0) && !isStreaming;

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  // Dictated text arrives through React state rather than a direct DOM edit,
  // so the resize has to run after the textarea's value has actually
  // committed — a plain state effect, rather than calling resize() right
  // where onChange fires, which would measure the height one update stale.
  useEffect(() => {
    resize();
  }, [value]);

  // Leaving the chat view (Settings, Leaderboard) unmounts the composer
  // entirely, so an in-progress recording has to be torn down here or the
  // browser mic indicator would keep running with nothing listening to it.
  // Read via a ref rather than depending on `speech` directly: that object's
  // identity changes on every state transition (idle -> listening -> idle),
  // which would otherwise fire this cleanup — and cancel the recording it
  // just started — on the very first transition rather than only on unmount.
  const speechRef = useRef(speech);
  speechRef.current = speech;
  useEffect(() => () => speechRef.current.cancel(), []);

  function handleMicClick() {
    if (listening) {
      speech.stop();
      textareaRef.current?.focus();
      return;
    }
    speech.start(value, onChange);
    textareaRef.current?.focus();
  }

  function handleInput(e) {
    onChange(e.target.value);
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
    if (listening) speech.stop();
    onSend(value, images.map((img) => img.dataUrl));
    setImages([]);
    setAttachError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape' && listening) {
      e.preventDefault();
      speech.cancel();
      return;
    }
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

      {(attachError || speech.error) && (
        <div className="attach-error">{attachError || speech.error}</div>
      )}

      <div className={`composer${listening ? ' listening' : ''}`}>
        <button
          type="button"
          className="attach-btn"
          aria-label="Attach an image"
          disabled={listening}
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
          placeholder={listening ? 'Listening…' : 'Ask about Nado, a trading idea, or paste a chart…'}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        {listening && (
          <button
            type="button"
            className="mic-cancel-btn"
            aria-label="Cancel voice input"
            onClick={() => {
              speech.cancel();
              textareaRef.current?.focus();
            }}
          >
            <CloseIcon />
          </button>
        )}
        {SPEECH_TO_TEXT_SUPPORTED && (
          <button
            type="button"
            className={`mic-btn${listening ? ' listening' : ''}`}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            aria-pressed={listening}
            onClick={handleMicClick}
          >
            <MicIcon />
          </button>
        )}
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
