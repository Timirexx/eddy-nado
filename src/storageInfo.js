/**
 * Read-only reporting over what the app keeps on the device, for the Library
 * and Storage sections of Settings.
 *
 * Figures are measured rather than estimated: localStorage stores strings, so
 * the byte cost of a value is its UTF-16 length in bytes, which TextEncoder
 * gives exactly for the UTF-8 the browser actually accounts against quota.
 */

const CONVERSATIONS_KEY = 'eddy.conversations.v1';

// Browsers do not expose the localStorage quota. ~5MB is the near-universal
// figure and is what the conversation store's shedding logic assumes, so the
// same number is used here for a consistent picture.
const ASSUMED_QUOTA_BYTES = 5 * 1024 * 1024;

const byteLength = (str) => new TextEncoder().encode(str).length;

export function readConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => c && Array.isArray(c.messages)) : [];
  } catch {
    return [];
  }
}

export function libraryStats() {
  const conversations = readConversations();

  let questions = 0;
  let replies = 0;
  let images = 0;
  let shedImages = 0;

  for (const c of conversations) {
    for (const m of c.messages) {
      if (m.role === 'user') questions += 1;
      else replies += 1;
      images += m.images?.length || 0;
      shedImages += m.shedImageCount || 0;
    }
  }

  const oldest = conversations.reduce(
    (min, c) => (c.createdAt && (!min || c.createdAt < min) ? c.createdAt : min),
    null,
  );

  return { conversations: conversations.length, questions, replies, images, shedImages, oldest };
}

export function storageUsage() {
  let conversationBytes = 0;
  let otherBytes = 0;
  const others = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const size = byteLength(key) + byteLength(localStorage.getItem(key) ?? '');
      if (key === CONVERSATIONS_KEY) conversationBytes = size;
      else {
        otherBytes += size;
        others.push({ key, size });
      }
    }
  } catch {
    return { available: false, conversationBytes: 0, otherBytes: 0, totalBytes: 0, quota: ASSUMED_QUOTA_BYTES, others: [] };
  }

  others.sort((a, b) => b.size - a.size);

  return {
    available: true,
    conversationBytes,
    otherBytes,
    totalBytes: conversationBytes + otherBytes,
    quota: ASSUMED_QUOTA_BYTES,
    // Wallet libraries keep their own keys here; showing them separately makes
    // it obvious what is Eddy's and what belongs to the wallet connection.
    others: others.slice(0, 6),
  };
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Downloads every stored conversation as JSON so history isn't trapped on one device. */
export function exportConversations() {
  const payload = {
    app: 'Eddy for Nado',
    exportedAt: new Date().toISOString(),
    conversations: readConversations(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eddy-conversations-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick; revoking synchronously can cancel the download
  // in some browsers before it starts.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return payload.conversations.length;
}

export function clearConversations() {
  try {
    localStorage.removeItem(CONVERSATIONS_KEY);
    return true;
  } catch {
    return false;
  }
}
