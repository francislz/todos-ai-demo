/**
 * Test double for `next/navigation` in jsdom. Like Next.js, it re-renders useSearchParams()
 * consumers when the app calls window.history.replaceState.
 */
import { useMemo, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const originalReplaceState = window.history.replaceState.bind(window.history);

window.history.replaceState = (...args: Parameters<History['replaceState']>) => {
  originalReplaceState(...args);
  for (const listener of listeners) listener();
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () => window.location.search);
  return useMemo(() => new URLSearchParams(search), [search]);
}
