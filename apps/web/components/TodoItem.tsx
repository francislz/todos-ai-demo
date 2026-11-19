'use client';

import type { Label, Todo } from '@todos/core/client';
import { LabelChipList } from './LabelChip';
import { LABEL_PICKER_VARIANTS, LabelPicker } from './LabelPicker';

interface TodoItemProps {
  todo: Todo;
  /** All labels, sorted by name. */
  labels: readonly Label[];
  busy: boolean;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onSetLabels: (todo: Todo, labelIds: string[]) => void;
  onManageLabels: () => void;
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function TodoItem({
  todo,
  labels,
  busy,
  onToggle,
  onDelete,
  onSetLabels,
  onManageLabels,
}: TodoItemProps) {
  const checkboxId = `todo-${todo.id}`;
  const todoLabels = labels.filter((label) => todo.labelIds.includes(label.id));

  function handleApply(labelIds: string[]) {
    if (!sameIds(labelIds, todo.labelIds)) onSetLabels(todo, labelIds);
  }

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
      <div className="todo-item__labels" data-testid="todo-labels">
        <LabelChipList labels={todoLabels} />
        <LabelPicker
          labels={labels}
          selectedIds={todo.labelIds}
          accessibleName={`Edit labels of "${todo.title}"`}
          triggerTestId="todo-labels-edit"
          variant={LABEL_PICKER_VARIANTS.todo}
          disabled={busy}
          onApply={handleApply}
          onManageLabels={onManageLabels}
        />
      </div>
    </li>
  );
}
