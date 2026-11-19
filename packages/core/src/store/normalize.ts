import type { Todo } from '../todo';
import type { StoreData } from './todo-store';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Turns whatever was persisted (possibly an older or hand-edited file) into a valid StoreData.
 * Missing or non-array collections become empty. Always returns new objects.
 */
export function normalizeStoreData(raw: unknown): StoreData {
  const source = isRecord(raw) ? raw : {};
  const todos = Array.isArray(source.todos) ? (source.todos as Todo[]) : [];
  return { todos: todos.map((todo) => ({ ...todo })) };
}
