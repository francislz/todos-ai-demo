'use client';

import type { Label } from '@todos/core/client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { parseLabelFilter, serializeLabelFilter, type LabelFilter } from '@/lib/label-filter';

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

  const write = useCallback((next: LabelFilter) => {
    const { pathname, search, hash } = window.location;
    const query = serializeLabelFilter(next, new URLSearchParams(search));
    window.history.replaceState(null, '', `${pathname}${query ? `?${query}` : ''}${hash}`);
  }, []);

  const toggle = useCallback(
    (labelId: string) => {
      const selected = new Set(filter.labelIds);
      if (selected.has(labelId)) selected.delete(labelId);
      else selected.add(labelId);
      const labelIds = labels.filter((label) => selected.has(label.id)).map((label) => label.id);
      write({ ...filter, labelIds });
    },
    [filter, labels, write],
  );

  const toggleNoLabel = useCallback(
    () => write({ ...filter, noLabel: !filter.noLabel }),
    [filter, write],
  );

  const clear = useCallback(() => write({ labelIds: [], noLabel: false }), [write]);

  const drop = useCallback(
    (labelId: string) =>
      write({ ...filter, labelIds: filter.labelIds.filter((id) => id !== labelId) }),
    [filter, write],
  );

  return { filter, toggle, toggleNoLabel, clear, drop };
}
