'use client';

import type { Label } from '@todos/core/client';
import { useCallback, useMemo, useState } from 'react';

interface Selection {
  /** The filter the selection was made under; a different filter resets the selection. */
  filterKey: string;
  labelIds: string[];
}

export interface UseFormLabelSelectionResult {
  labelIds: string[];
  setLabelIds: (labelIds: string[]) => void;
  /** Back to the filtered labels (after a successful add). */
  reset: () => void;
}

/**
 * The add form's labels: they start as the filtered labels and are reset to them whenever the
 * filter changes. Ids of labels that no longer exist are dropped.
 */
export function useFormLabelSelection(
  filterLabelIds: string[],
  labels: readonly Label[],
): UseFormLabelSelectionResult {
  const filterKey = filterLabelIds.join('\n');
  const [selection, setSelection] = useState<Selection | null>(null);

  const labelIds = useMemo(() => {
    const chosen = selection?.filterKey === filterKey ? selection.labelIds : filterLabelIds;
    const existing = new Set(labels.map((label) => label.id));
    return chosen.filter((id) => existing.has(id));
  }, [selection, filterKey, filterLabelIds, labels]);

  const setLabelIds = useCallback(
    (next: string[]) => setSelection({ filterKey, labelIds: next }),
    [filterKey],
  );
  const reset = useCallback(() => setSelection(null), []);

  return { labelIds, setLabelIds, reset };
}
