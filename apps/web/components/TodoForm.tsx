'use client';

import { TODO_TITLE_MAX_LENGTH, type Label } from '@todos/core/client';
import { useState, type FormEvent } from 'react';
import { LabelChipList } from './LabelChip';
import { LABEL_PICKER_VARIANTS, LabelPicker } from './LabelPicker';

interface TodoFormProps {
  /** All labels, sorted by name. */
  labels: readonly Label[];
  /** Labels of the todo being added (controlled; pre-filled from the filter). */
  selectedLabelIds: readonly string[];
  onSelectedLabelIdsChange: (labelIds: string[]) => void;
  /** Resolves to true when the todo was created. */
  onCreate: (title: string) => Promise<boolean>;
  onManageLabels: () => void;
}

export function TodoForm({
  labels,
  selectedLabelIds,
  onSelectedLabelIdsChange,
  onCreate,
  onManageLabels,
}: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = title.trim().length > 0 && !submitting;
  const selectedLabels = labels.filter((label) => selectedLabelIds.includes(label.id));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const created = await onCreate(title);
    setSubmitting(false);
    if (created) setTitle('');
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit} aria-label="Add a todo">
      <div className="todo-form__row">
        <label htmlFor="new-todo-title" className="visually-hidden">
          New todo
        </label>
        <input
          id="new-todo-title"
          data-testid="new-todo-input"
          className="todo-form__input"
          placeholder="What needs to be done?"
          value={title}
          maxLength={TODO_TITLE_MAX_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
          autoFocus
        />
        <button
          type="submit"
          data-testid="add-todo-button"
          className="button button--primary"
          disabled={!canSubmit}
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
      <div className="todo-form__labels" data-testid="form-labels">
        <LabelChipList labels={selectedLabels} />
        <LabelPicker
          labels={labels}
          selectedIds={selectedLabelIds}
          accessibleName="Labels for the new todo"
          triggerTestId="form-labels-edit"
          variant={LABEL_PICKER_VARIANTS.form}
          onApply={onSelectedLabelIdsChange}
          onManageLabels={onManageLabels}
        />
      </div>
    </form>
  );
}
