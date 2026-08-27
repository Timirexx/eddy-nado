import { useCallback, useEffect, useRef, useState } from 'react';
import { deriveTitle, loadConversations, saveConversations } from './storage.js';

/**
 * Cheap equality for a message list. Deep-comparing would mean walking base64
 * image payloads on every keystroke of a stream; message count plus the last
 * message's identity and length is enough to catch both a new message arriving
 * and a streaming reply growing.
 */
function sameMessages(a, b) {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  const x = a[a.length - 1];
  const y = b[b.length - 1];
  return x.id === y.id && x.text.length === y.text.length;
}

/**
 * Owns the conversation list and which one is open.
 *
 * A conversation is only written to storage once it actually has messages, so
 * clicking "New chat" repeatedly doesn't litter the sidebar with empty entries.
 * The active conversation therefore exists as an id before it exists on disk —
 * `activeId` can point at a conversation that isn't in `conversations` yet.
 *
 * As with useChat, a ref mirrors the list so callbacks can read current state
 * without depending on render timing.
 */
export function useConversations() {
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeId, setActiveId] = useState(() => `c${Date.now().toString(36)}`);
  const [storageWarning, setStorageWarning] = useState(null);

  const listRef = useRef(conversations);
  useEffect(() => {
    listRef.current = conversations;
  }, [conversations]);

  const persist = useCallback((next) => {
    const result = saveConversations(next);

    // saveConversations may have shed images or dropped old conversations to
    // fit the quota. Render what was actually stored, not what we asked to
    // store, so the UI never shows history that won't survive a refresh.
    setConversations(result.stored);
    listRef.current = result.stored;

    if (!result.ok) {
      setStorageWarning("This chat is too large to save — history won't survive a refresh.");
    } else if (result.degraded === 'dropped') {
      setStorageWarning('Storage was full, so the oldest chats were removed.');
    } else if (result.degraded === 'images') {
      setStorageWarning('Storage was full, so images in older chats were cleared.');
    } else {
      setStorageWarning(null);
    }
  }, []);

  /**
   * Writes the live message list into the conversation it belongs to. The id is
   * passed explicitly rather than read from state so that switching
   * conversations mid-stream cannot file messages under the wrong one.
   */
  const syncMessages = useCallback(
    (conversationId, messages) => {
      const current = listRef.current;
      const existing = current.find((c) => c.id === conversationId);

      if (messages.length === 0) {
        // Nothing worth keeping; remove it if it had been saved before.
        if (existing) persist(current.filter((c) => c.id !== conversationId));
        return;
      }

      // Opening a conversation re-runs this with its stored messages. Without
      // this guard that would rewrite updatedAt and jump the conversation to
      // the top of the list, so merely reading an old chat would reorder the
      // sidebar — and write to storage for no reason.
      if (existing && sameMessages(existing.messages, messages)) return;

      const now = Date.now();
      const updated = {
        id: conversationId,
        title: existing?.title && existing.pinnedTitle ? existing.title : deriveTitle(messages),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        messages,
      };

      // Newest-first, and an updated conversation moves to the top.
      const rest = current.filter((c) => c.id !== conversationId);
      persist([updated, ...rest]);
    },
    [persist],
  );

  const startNew = useCallback(() => {
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setActiveId(id);
    return id;
  }, []);

  const remove = useCallback(
    (id) => {
      const next = listRef.current.filter((c) => c.id !== id);
      persist(next);
      // Deleting the open conversation drops you into a fresh one rather than
      // leaving the thread showing something that no longer exists.
      if (id === activeId) startNew();
    },
    [persist, activeId, startNew],
  );

  const select = useCallback((id) => {
    setActiveId(id);
  }, []);

  const getMessages = useCallback(
    (id) => listRef.current.find((c) => c.id === id)?.messages ?? [],
    [],
  );

  return {
    conversations,
    activeId,
    storageWarning,
    dismissWarning: () => setStorageWarning(null),
    syncMessages,
    startNew,
    select,
    remove,
    getMessages,
  };
}
