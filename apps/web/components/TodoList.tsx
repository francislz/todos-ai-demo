'use client';

import type { Label, Todo } from '@todos/core/client';
import { ClearFilterButton } from './FilterStatus';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  /** The visible (filtered) todos. */
  todos: Todo[];
  /** All labels, sorted by name. */
  labels: readonly Label[];
  busyIds: ReadonlySet<string>;
  /** True when a filter is active, so an empty list means "nothing matches". */
  filtered: boolean;
  onClearFilter: () => void;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onSetLabels: (todo: Todo, labelIds: string[]) => void;
  onManageLabels: () => void;
}

export function TodoList({
  todos,
  labels,
  busyIds,
  filtered,
  onClearFilter,
  onToggle,
  onDelete,
  onSetLabels,
  onManageLabels,
}: TodoListProps) {
  if (todos.length === 0 && filtered) {
    return (
      <div className="empty-state" data-testid="filtered-empty-state">
        <p className="empty-state__text">No todos match this filter.</p>
        <ClearFilterButton onClear={onClearFilter} />
      </div>
    );
  }

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
          labels={labels}
          busy={busyIds.has(todo.id)}
          onToggle={onToggle}
          onDelete={onDelete}
          onSetLabels={onSetLabels}
          onManageLabels={onManageLabels}
        />
      ))}
    </ul>
  );
}
