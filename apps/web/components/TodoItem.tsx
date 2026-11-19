'use client';

import type { Todo } from '@todos/core/client';

interface TodoItemProps {
  todo: Todo;
  busy: boolean;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export function TodoItem({ todo, busy, onToggle, onDelete }: TodoItemProps) {
  const checkboxId = `todo-${todo.id}`;

  return (
    <li
      className={`todo-item${todo.completed ? ' todo-item--completed' : ''}`}
      data-testid="todo-item"
      data-completed={todo.completed}
      aria-busy={busy}
    >
      <input
        id={checkboxId}
        type="checkbox"
        className="todo-item__checkbox"
        data-testid="todo-toggle"
        checked={todo.completed}
        disabled={busy}
        onChange={() => onToggle(todo)}
        aria-label={todo.completed ? `Reopen "${todo.title}"` : `Complete "${todo.title}"`}
      />
      <label htmlFor={checkboxId} className="todo-item__title" data-testid="todo-title">
        {todo.title}
      </label>
      <button
        type="button"
        className="button button--ghost"
        data-testid="todo-delete"
        disabled={busy}
        onClick={() => onDelete(todo)}
        aria-label={`Delete "${todo.title}"`}
      >
        Delete
      </button>
    </li>
  );
}
