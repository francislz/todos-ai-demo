import type { Label } from '../label';
import type { Todo } from '../todo';
import type { StoreData } from './todo-store';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** The object entries of a persisted collection; anything else (null, numbers, strings, arrays) is dropped. */
function recordsOf<T>(value: unknown): T[] {
  return asArray<unknown>(value).filter(isRecord) as T[];
}

/**
 * Turns whatever was persisted (possibly an older or hand-edited file) into a valid StoreData:
 * - missing or non-array `labels` / `todos` become [];
 * - non-object entries in `labels` / `todos` are dropped;
 * - a todo without `labelIds` (a file written before labels existed) gets [];
 * - label ids that match no stored label are dropped.
 * Always returns new objects; never mutates its input.
 */
export function normalizeStoreData(raw: unknown): StoreData {
  const source = isRecord(raw) ? raw : {};
  const labels = recordsOf<Label>(source.labels).map((label) => ({ ...label }));
  const labelIdSet = new Set(labels.map((label) => label.id));
  const todos = recordsOf<Todo>(source.todos).map((todo) => ({
    ...todo,
    labelIds: asArray<unknown>(todo.labelIds).filter(
      (id): id is string => typeof id === 'string' && labelIdSet.has(id),
    ),
  }));
  return { todos, labels };
}
