'use client';

import type { Todo } from '@todos/core/client';
import { useMemo, useState } from 'react';
import { todosApi as defaultApi, type TodosApi } from '@/lib/api-client';
import { TodoForm } from './TodoForm';
import { TodoList } from './TodoList';

interface TodoAppProps {
  initialTodos: Todo[];
  /** Injected in tests; defaults to the real HTTP client. */
  api?: TodosApi;
}

/** Same ordering as the server: open first, newest first within each group. */
function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function TodoApp({ initialTodos, api = defaultApi }: TodoAppProps) {
  const [todos, setTodos] = useState<Todo[]>(() => sortTodos(initialTodos));
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const openCount = useMemo(() => todos.filter((todo) => !todo.completed).length, [todos]);
  const doneCount = todos.length - openCount;

  function setBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleCreate(title: string): Promise<boolean> {
    setError(null);
    try {
      const todo = await api.create(title);
      setTodos((current) => sortTodos([todo, ...current]));
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  }

  async function handleToggle(todo: Todo) {
    setError(null);
    setBusy(todo.id, true);
    try {
      const updated = await api.setCompleted(todo.id, !todo.completed);
      setTodos((current) => sortTodos(current.map((t) => (t.id === updated.id ? updated : t))));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(todo.id, false);
    }
  }

  async function handleDelete(todo: Todo) {
    setError(null);
    setBusy(todo.id, true);
    try {
      await api.remove(todo.id);
      setTodos((current) => current.filter((t) => t.id !== todo.id));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(todo.id, false);
    }
  }

  return (
    <section className="card" aria-labelledby="todos-heading">
      <header className="card__header">
        <h2 id="todos-heading">My todos</h2>
        <p className="counter" data-testid="todo-counter">
          {openCount} open · {doneCount} done
        </p>
      </header>

      <TodoForm onCreate={handleCreate} />

      {error && (
        <p className="error-banner" role="alert" data-testid="error-banner">
          {error}
        </p>
      )}

      <TodoList todos={todos} busyIds={busyIds} onToggle={handleToggle} onDelete={handleDelete} />
    </section>
  );
}
