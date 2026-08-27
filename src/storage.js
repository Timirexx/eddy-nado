/**
 * Conversation persistence.
 *
 * This project has no database and no auth to scope conversations to a user,
 * so history lives in localStorage. It survives refreshes and reopening the
 * app, which is what history needs; the tradeoff is that it is per-browser and
 * per-device rather than synced.
 *
 * The awkward part is images. A pasted chart is ~30-50KB of base64 and
 * localStorage caps out around 5MB, so a handful of screenshots can fill the
 * quota. Writing blindly throws QuotaExceededError, which would take the whole
 * app down on an ordinary save. saveConversations degrades instead: it sheds
 * image payloads from the oldest conversations first, then drops whole
 * conversations, keeping recent history intact for as long as possible.
 */

const STORAGE_KEY = 'eddy.conversations.v1';
const TITLE_MAX = 52;

// Used when localStorage is unavailable (private mode, disabled site data) so
// history still works for the session rather than the app crashing on boot.
let memoryFallback = null;

function getStore() {
  try {
    const probe = '__eddy_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function isQuotaError(err) {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014)
  );
}

/** Strips base64 payloads but remembers that images were there. */
function shedImages(conversation) {
  let shed = 0;
  const messages = conversation.messages.map((m) => {
    if (!m.images?.length) return m;
    shed += m.images.length;
    return { ...m, images: [], shedImageCount: (m.shedImageCount || 0) + m.images.length };
  });
  return shed === 0 ? null : { ...conversation, messages };
}

export function loadConversations() {
  const store = getStore();
  if (!store) return memoryFallback ?? [];

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Defensive: a hand-edited or partially-written value shouldn't be able to
    // crash rendering, so anything malformed is dropped rather than trusted.
    return parsed
      .filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages))
      .map((c) => ({
        id: c.id,
        title: typeof c.title === 'string' ? c.title : 'Untitled chat',
        createdAt: Number(c.createdAt) || Date.now(),
        updatedAt: Number(c.updatedAt) || Number(c.createdAt) || Date.now(),
        messages: c.messages
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
          .map((m) => ({
            id: typeof m.id === 'string' ? m.id : `r${Math.random().toString(36).slice(2)}`,
            role: m.role,
            text: typeof m.text === 'string' ? m.text : '',
            images: Array.isArray(m.images) ? m.images : [],
            ...(m.shedImageCount ? { shedImageCount: m.shedImageCount } : {}),
          })),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/**
 * @returns {{ok: boolean, stored: Array, degraded: null | 'images' | 'dropped'}}
 */
export function saveConversations(conversations) {
  const store = getStore();
  if (!store) {
    memoryFallback = conversations;
    return { ok: true, stored: conversations, degraded: null };
  }

  const attempt = (list) => {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      if (isQuotaError(err)) return false;
      throw err;
    }
  };

  if (attempt(conversations)) {
    return { ok: true, stored: conversations, degraded: null };
  }

  // Over quota. Shed images oldest-first — the newest conversation is the one
  // the user is most likely looking at, so it keeps its images longest.
  let working = [...conversations];
  let degraded = null;

  for (let i = working.length - 1; i >= 0; i--) {
    const lighter = shedImages(working[i]);
    if (!lighter) continue;
    working[i] = lighter;
    degraded = 'images';
    if (attempt(working)) return { ok: true, stored: working, degraded };
  }

  // Still too large with every image gone: drop whole conversations, oldest
  // first, always keeping at least the most recent one.
  while (working.length > 1) {
    working = working.slice(0, -1);
    degraded = 'dropped';
    if (attempt(working)) return { ok: true, stored: working, degraded };
  }

  // A single conversation that cannot fit even stripped. Give up rather than
  // clearing storage out from under the user.
  return { ok: false, stored: conversations, degraded };
}

export function clearConversations() {
  const store = getStore();
  memoryFallback = null;
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    /* nothing useful to do */
  }
}

/**
 * Builds a conversation title from its first user message, cut at a word
 * boundary so titles don't end mid-word.
 */
export function deriveTitle(messages) {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New chat';

  const text = (first.text || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    const count = first.images?.length || first.shedImageCount || 0;
    return count > 1 ? `${count} images` : 'Shared an image';
  }

  if (text.length <= TITLE_MAX) return text;

  const cut = text.slice(0, TITLE_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  // Only honour the word boundary if it isn't so early that the title becomes
  // uninformative; a single very long word falls back to a hard cut.
  const base = lastSpace > TITLE_MAX * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,.;:!?-]+$/, '')}…`;
}
