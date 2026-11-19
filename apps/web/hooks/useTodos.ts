'use client';

import { sortTodos, type CreateTodoInput, type Todo } from '@todos/core/client';
import { useCallback, useState } from 'react';
import type { TodosApi } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';

export interface UseTodosResult {
  todos: Todo[];
  busyIds: ReadonlySet<string>;
  error: string | null;
  create: (input: CreateTodoInput) => Promise<Todo | null>;
  toggle: (todo: Todo) => Promise<void>;
  setLabels: (todo: Todo, labelIds: string[]) => Promise<void>;
  remove: (todo: Todo) => Promise<void>;
  /** Local only: strips a deleted label from every todo (the server already did it). */
  removeLabelFromAll: (labelId: string) => void;
}

type ActionResult<T> = { ok: true; value: T } | { ok: false };

/** Todo state seeded from the server render, plus the actions that keep it in sync with the API. */
export function useTodos(api: TodosApi, initialTodos: Todo[]): UseTodosResult {
  const [todos, setTodos] = useState<Todo[]>(() => sortTodos(initialTodos));
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const setBusy = useCallback((id: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Clears the error, marks the todo busy while `work` runs and reports a failure as the error. */
  const runAction = useCallback(
    async <T>(work: () => Promise<T>, busyId?: string): Promise<ActionResult<T>> => {
      setError(null);
      if (busyId) setBusy(busyId, true);
      try {
        return { ok: true, value: await work() };
      } catch (err) {
        setError(errorMessage(err));
        return { ok: false };
      } finally {
        if (busyId) setBusy(busyId, false);
      }
    },
    [setBusy],
  );

  const replaceTodo = useCallback((updated: Todo) => {
    setTodos((current) => sortTodos(current.map((t) => (t.id === updated.id ? updated : t))));
  }, []);

  const create = useCallback(
    async (input: CreateTodoInput) => {
      const result = await runAction(() => api.create(input));
      if (!result.ok) return null;
      setTodos((current) => sortTodos([result.value, ...current]));
      return result.value;
    },
    [api, runAction],
  );

  const toggle = useCallback(
    async (todo: Todo) => {
      const result = await runAction(
        () => api.update(todo.id, { completed: !todo.completed }),
        todo.id,
      );
      if (result.ok) replaceTodo(result.value);
    },
    [api, runAction, replaceTodo],
  );

  const setLabels = useCallback(
    async (todo: Todo, labelIds: string[]) => {
      const result = await runAction(() => api.update(todo.id, { labelIds }), todo.id);
      if (result.ok) replaceTodo(result.value);
    },
    [api, runAction, replaceTodo],
  );

  const remove = useCallback(
    async (todo: Todo) => {
      const result = await runAction(() => api.remove(todo.id), todo.id);
      if (result.ok) setTodos((current) => current.filter((t) => t.id !== todo.id));
    },
    [api, runAction],
  );

  const removeLabelFromAll = useCallback((labelId: string) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.labelIds.includes(labelId)
          ? { ...todo, labelIds: todo.labelIds.filter((id) => id !== labelId) }
          : todo,
      ),
    );
  }, []);

  return { todos, busyIds, error, create, toggle, setLabels, remove, removeLabelFromAll };
}
