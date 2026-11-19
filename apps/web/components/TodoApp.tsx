'use client';

import type { Todo } from '@todos/core/client';
import { useMemo } from 'react';
import { useTodos } from '@/hooks/useTodos';
import { todosApi as defaultApi, type TodosApi } from '@/lib/api-client';
import { TodoForm } from './TodoForm';
import { TodoList } from './TodoList';

interface TodoAppProps {
  initialTodos: Todo[];
  /** Injected in tests; defaults to the real HTTP client. */
  api?: TodosApi;
}

/** Composition only: state and actions live in hooks, markup in presentational components. */
export function TodoApp({ initialTodos, api = defaultApi }: TodoAppProps) {
  const { todos, busyIds, error, create, toggle, remove } = useTodos(api, initialTodos);

  const openCount = useMemo(() => todos.filter((todo) => !todo.completed).length, [todos]);
  const doneCount = todos.length - openCount;

  return (
    <section className="card" aria-labelledby="todos-heading">
      <header className="card__header">
        <h2 id="todos-heading">My todos</h2>
        <p className="counter" data-testid="todo-counter">
          {openCount} open · {doneCount} done
        </p>
      </header>

      <TodoForm onCreate={async (title) => (await create(title)) !== null} />

      {error && (
        <p className="error-banner" role="alert" data-testid="error-banner">
          {error}
        </p>
      )}

      <TodoList todos={todos} busyIds={busyIds} onToggle={toggle} onDelete={remove} />
    </section>
  );
}
