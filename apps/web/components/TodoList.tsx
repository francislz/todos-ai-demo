'use client';

import type { Todo } from '@todos/core/client';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  busyIds: ReadonlySet<string>;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export function TodoList({ todos, busyIds, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="empty-state" data-testid="empty-state">
        Nothing to do yet. Add your first todo above.
      </p>
    );
  }

  return (
    <ul className="todo-list" data-testid="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          busy={busyIds.has(todo.id)}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
