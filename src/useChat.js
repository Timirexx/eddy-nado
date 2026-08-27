import { useCallback, useRef, useState } from 'react';

/**
 * Drives the conversation against /api/chat.
 *
 * Messages are held in the shape the API expects ({role, text, images}) plus a
 * little local-only state, so sending is a filter-and-post rather than a
 * translation step that can drift from the server's contract.
 *
 * A ref mirrors the message list and is the source of truth for anything read
 * outside of render. React does not run setState updater callbacks
 * synchronously — they run during the next render — so reading the current
 * history out of one produces an empty array at call time. The ref is written
 * and read synchronously, which is what the request builder and the streaming
 * callbacks both need.
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | streaming | error
  const [error, setError] = useState(null);

  const messagesRef = useRef([]);
  const abortRef = useRef(null);
  const idRef = useRef(0);

  const nextId = () => `m${++idRef.current}`;

  // Single write path, so the ref and the rendered state can never disagree.
  const commit = useCallback((next) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const patch = useCallback(
    (id, changes) => {
      commit(
        messagesRef.current.map((m) =>
          m.id === id ? { ...m, ...(typeof changes === 'function' ? changes(m) : changes) } : m,
        ),
      );
    },
    [commit],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    commit([]);
    setError(null);
    setStatus('idle');
  }, [commit]);

  const send = useCallback(
    async (text, images = []) => {
      const trimmed = (text ?? '').trim();
      if ((!trimmed && images.length === 0) || abortRef.current) return;

      setError(null);

      const userMessage = { id: nextId(), role: 'user', text: trimmed, images };
      const assistantId = nextId();

      const history = [...messagesRef.current, userMessage];
      commit([
        ...history,
        { id: assistantId, role: 'assistant', text: '', images: [], pending: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      setStatus('streaming');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, text: m.text, images: m.images })),
          }),
        });

        if (!res.ok) {
          // Validation, rate-limit, and configuration failures come back as
          // JSON before the stream opens.
          const body = await res.json().catch(() => ({}));
          if (res.status === 429 && body.retryAfter) {
            throw new Error(`${body.error} (about ${formatWait(body.retryAfter)} to wait.)`);
          }
          throw new Error(body.error || `Request failed (${res.status}).`);
        }
        if (!res.body) throw new Error('Streaming is not supported by this browser.');

        await readEventStream(res.body, (event, data) => {
          if (event === 'delta') {
            patch(assistantId, (m) => ({ text: m.text + data.text, pending: false }));
          } else if (event === 'error') {
            setError(data.message);
          } else if (event === 'truncated') {
            patch(assistantId, { truncated: true });
          }
        });

        // A refusal or an early failure can close the stream having written
        // nothing; an empty bubble left behind reads as a silent hang.
        dropIfEmpty(assistantId);
        setStatus('idle');
      } catch (err) {
        dropIfEmpty(assistantId);
        if (err.name === 'AbortError') {
          setStatus('idle');
        } else {
          setError(err.message || 'Something went wrong.');
          setStatus('error');
        }
      } finally {
        abortRef.current = null;
      }

      function dropIfEmpty(id) {
        commit(messagesRef.current.filter((m) => m.id !== id || m.text.trim().length > 0));
      }
    },
    [commit, patch],
  );

  return { messages, status, error, send, stop, reset, isStreaming: status === 'streaming' };
}

function formatWait(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? 'a minute' : `${minutes} minutes`;
}

/**
 * Minimal SSE reader. Chunks split anywhere, including mid-event, so text is
 * buffered until a blank-line terminator proves an event is complete.
 */
async function readEventStream(body, onEvent) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      let event = 'message';
      let data = '';
      for (const line of raw.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (!data) continue;

      try {
        onEvent(event, JSON.parse(data));
      } catch {
        // A malformed frame shouldn't kill an otherwise healthy stream.
      }
    }
  }
}
