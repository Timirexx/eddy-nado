import { useCallback, useEffect, useRef, useState } from 'react';

const REFRESH_MS = 30000;

/**
 * Live Nado subaccount state for the connected wallet.
 *
 * Polls rather than streams: the gateway has no public websocket for account
 * state, and 30s is frequent enough for a sidebar summary without hammering it.
 * Refreshing pauses while the tab is hidden — a backgrounded tab polling
 * forever is just wasted requests.
 *
 * `status` distinguishes "no Nado account" from "failed to load", because the
 * first is a normal state for a new wallet and the second is not.
 */
export function useNadoAccount(address) {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const abortRef = useRef(null);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!address) {
        setState({ status: 'idle', data: null, error: null });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // A background refresh keeps the previous numbers on screen instead of
      // flashing a loading state over figures that are still basically current.
      setState((s) => ({ ...s, status: quiet && s.data ? 'refreshing' : 'loading' }));

      try {
        const res = await fetch(`/api/account?address=${address}`, { signal: controller.signal });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
        setState({ status: 'ready', data: body, error: null });
      } catch (err) {
        if (err.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: err.message });
      }
    },
    [address],
  );

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    if (!address) return undefined;
    let timer;
    const tick = () => {
      if (!document.hidden) load({ quiet: true });
      timer = window.setTimeout(tick, REFRESH_MS);
    };
    timer = window.setTimeout(tick, REFRESH_MS);

    // Catch up immediately when the tab comes back rather than waiting out the
    // remainder of an interval that ran while it was hidden.
    const onVisible = () => {
      if (!document.hidden) load({ quiet: true });
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [address, load]);

  return { ...state, reload: () => load({ quiet: true }) };
}

/** Nado's documented risk bands for maintenance margin usage. */
export function riskBand(usagePercent) {
  if (usagePercent >= 90) return { key: 'extreme', label: 'Extreme risk' };
  if (usagePercent >= 70) return { key: 'high', label: 'High risk' };
  if (usagePercent >= 40) return { key: 'medium', label: 'Medium risk' };
  return { key: 'low', label: 'Low risk' };
}

export function formatUsd(value, { sign = false } = {}) {
  if (!Number.isFinite(value)) return '—';
  const formatted = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Minus sign U+2212 rather than a hyphen, to match the tabular figures.
  const prefix = value < 0 ? '−' : sign ? '+' : '';
  return `${prefix}$${formatted}`;
}

export function formatSize(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const decimals = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return abs.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
