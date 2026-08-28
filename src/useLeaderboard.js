import { useCallback, useEffect, useState } from 'react';

export const PERIODS = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'all', label: 'All-time' },
];

/**
 * Reads the global board from /api/leaderboard.
 *
 * The response carries `setupRequired` when no shared store is connected. That
 * is surfaced rather than papered over with sample rows — a board of invented
 * addresses would be fabricated records presented as real users.
 */
export function useLeaderboard(period, address) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(
    async (signal) => {
      setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading' }));
      try {
        const params = new URLSearchParams({ period, limit: '20' });
        if (address) params.set('address', address);

        const res = await fetch(`/api/leaderboard?${params}`, { signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Could not load the leaderboard (${res.status}).`);
        }
        const data = await res.json();
        setState({ status: 'ready', data, error: null });
      } catch (err) {
        if (err.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: err.message });
      }
    },
    [period, address],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { ...state, reload: () => load() };
}

/**
 * The signed-in user's own activity, derived from stored conversations.
 *
 * Always available, with no wallet and no backend, because it is computed from
 * data already on the device. It is what the "Your activity" card shows while
 * the global ranking is unavailable — real numbers about the person looking at
 * the screen, rather than a placeholder.
 */
export function localActivity(conversations) {
  const questions = conversations.reduce(
    (n, c) => n + c.messages.filter((m) => m.role === 'user').length,
    0,
  );
  return {
    questions,
    conversations: conversations.length,
    // Mirrors the server's scoring so the local preview and the ranked score
    // cannot drift apart.
    points: questions * 1 + conversations.length * 5,
  };
}
