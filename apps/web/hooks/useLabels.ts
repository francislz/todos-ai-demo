'use client';

import {
  sortLabels,
  type CreateLabelInput,
  type Label,
  type UpdateLabelInput,
} from '@todos/core/client';
import { useCallback, useState } from 'react';
import type { LabelsApi } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';

export const LABEL_ACTIONS = {
  create: 'create',
  update: 'update',
  remove: 'remove',
} as const;

export type LabelActionKind = (typeof LABEL_ACTIONS)[keyof typeof LABEL_ACTIONS];

/** The label request in flight (at most one at a time, the panel is disabled meanwhile). */
export interface PendingLabelAction {
  kind: LabelActionKind;
  labelId?: string;
}

export interface UseLabelsResult {
  /** Always sorted by name. */
  labels: Label[];
  pending: PendingLabelAction | null;
  error: string | null;
  clearError: () => void;
  create: (input: CreateLabelInput) => Promise<Label | null>;
  update: (id: string, input: UpdateLabelInput) => Promise<Label | null>;
  remove: (id: string) => Promise<boolean>;
}

/** Label state seeded from the server render, plus the Manage labels panel actions. */
export function useLabels(api: LabelsApi, initialLabels: Label[]): UseLabelsResult {
  const [labels, setLabels] = useState<Label[]>(() => sortLabels(initialLabels));
  const [pending, setPending] = useState<PendingLabelAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(action: PendingLabelAction, work: () => Promise<T>): Promise<T | null> => {
      setError(null);
      setPending(action);
      try {
        return await work();
      } catch (err) {
        setError(errorMessage(err));
        return null;
      } finally {
        setPending(null);
      }
    },
    [],
  );

  const create = useCallback(
    async (input: CreateLabelInput) => {
      const label = await run({ kind: LABEL_ACTIONS.create }, () => api.create(input));
      if (label) setLabels((current) => sortLabels([...current, label]));
      return label;
    },
    [api, run],
  );

  const update = useCallback(
    async (id: string, input: UpdateLabelInput) => {
      const label = await run({ kind: LABEL_ACTIONS.update, labelId: id }, () =>
        api.update(id, input),
      );
      if (label) {
        setLabels((current) => sortLabels(current.map((l) => (l.id === label.id ? label : l))));
      }
      return label;
    },
    [api, run],
  );

  const remove = useCallback(
    async (id: string) => {
      const removed = await run({ kind: LABEL_ACTIONS.remove, labelId: id }, async () => {
        await api.remove(id);
        return true;
      });
      if (removed) setLabels((current) => current.filter((l) => l.id !== id));
      return removed === true;
    },
    [api, run],
  );

  const clearError = useCallback(() => setError(null), []);

  return { labels, pending, error, clearError, create, update, remove };
}
