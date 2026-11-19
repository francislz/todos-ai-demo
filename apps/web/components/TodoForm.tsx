'use client';

import { TODO_TITLE_MAX_LENGTH } from '@todos/core/client';
import { useState, type FormEvent } from 'react';

interface TodoFormProps {
  onCreate: (title: string) => Promise<boolean>;
}

export function TodoForm({ onCreate }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = title.trim().length > 0 && !submitting;

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
    </form>
  );
}
