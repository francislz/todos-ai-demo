'use client';

import type { Label } from '@todos/core/client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EMPTY_LABEL_FILTER,
  parseLabelFilter,
  serializeLabelFilter,
  type LabelFilter,
} from '@/lib/label-filter';

export interface UseLabelFilterResult {
  filter: LabelFilter;
  toggle: (labelId: string) => void;
  toggleNoLabel: () => void;
  clear: () => void;
  /** Removes a (deleted) label from the filter. */
  drop: (labelId: string) => void;
}

/**
 * The label filter lives only in the URL. Writes use history.replaceState: Next.js syncs it with
 * useSearchParams without re-running the server page, and filter changes add no Back steps.
 */
export function useLabelFilter(labels: readonly Label[]): UseLabelFilterResult {
  const searchParams = useSearchParams();
  const filter = useMemo(() => parseLabelFilter(searchParams, labels), [searchParams, labels]);

  // Actions can run long after the render that created them (e.g. `drop` after an awaited
  // DELETE), so they read the filter from the current URL and the latest labels, never from a
  // captured render. Otherwise a chip toggled meanwhile would be reverted.
  const labelsRef = useRef(labels);
  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  const read = useCallback(
    (): LabelFilter =>
      parseLabelFilter(new URLSearchParams(window.location.search), labelsRef.current),
    [],
  );

  const write = useCallback((next: LabelFilter) => {
    const { pathname, search, hash } = window.location;
    const query = serializeLabelFilter(next, new URLSearchParams(search));
    window.history.replaceState(null, '', `${pathname}${query ? `?${query}` : ''}${hash}`);
  }, []);

  const toggle = useCallback(
    (labelId: string) => {
      const current = read();
      const selected = new Set(current.labelIds);
      if (selected.has(labelId)) selected.delete(labelId);
      else selected.add(labelId);
      const labelIds = labelsRef.current
        .filter((label) => selected.has(label.id))
        .map((label) => label.id);
      write({ ...current, labelIds });
    },
    [read, write],
  );

  const toggleNoLabel = useCallback(() => {
    const current = read();
    write({ ...current, noLabel: !current.noLabel });
  }, [read, write]);

  const clear = useCallback(() => write(EMPTY_LABEL_FILTER), [write]);

  const drop = useCallback(
    (labelId: string) => {
      const current = read();
      write({ ...current, labelIds: current.labelIds.filter((id) => id !== labelId) });
    },
    [read, write],
  );

  return { filter, toggle, toggleNoLabel, clear, drop };
}
