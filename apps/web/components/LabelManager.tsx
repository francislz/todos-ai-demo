'use client';

import {
  LABEL_NAME_MAX_LENGTH,
  LABELS_MAX,
  suggestLabelColor,
  type CreateLabelInput,
  type Label,
  type LabelColor,
  type UpdateLabelInput,
} from '@todos/core/client';
import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import { LABEL_ACTIONS, type PendingLabelAction } from '@/hooks/useLabels';
import { LabelColorPicker } from './LabelColorPicker';
import { LABEL_MANAGER_ID } from './LabelFilterBar';
import { LabelManagerRow, type LabelRowMode } from './LabelManagerRow';

interface LabelManagerProps {
  /** Sorted by name. */
  labels: readonly Label[];
  /** Number of todos (all, not only the filtered ones) using each label id. */
  usageCounts: ReadonlyMap<string, number>;
  pending: PendingLabelAction | null;
  error: string | null;
  onClearError: () => void;
  onCreate: (input: CreateLabelInput) => Promise<Label | null>;
  onUpdate: (id: string, input: UpdateLabelInput) => Promise<Label | null>;
  onRemove: (id: string) => Promise<boolean>;
  newLabelInputRef: RefObject<HTMLInputElement | null>;
}

const LABEL_LIMIT_MESSAGE = `You can have at most ${LABELS_MAX} labels. Delete one to create another.`;

/** Inline panel: create row on top, then one row per label (edit or delete-confirm, one at a time). */
export function LabelManager({
  labels,
  usageCounts,
  pending,
  error,
  onClearError,
  onCreate,
  onUpdate,
  onRemove,
  newLabelInputRef,
}: LabelManagerProps) {
  const [name, setName] = useState('');
  const [chosenColor, setChosenColor] = useState<LabelColor | null>(null);
  const [rowMode, setRowMode] = useState<LabelRowMode | null>(null);

  const color = chosenColor ?? suggestLabelColor(labels);
  const busy = pending !== null;
  const atLimit = labels.length >= LABELS_MAX;
  const creating = pending?.kind === LABEL_ACTIONS.create;
  const canCreate = name.trim().length > 0 && !busy && !atLimit;

  // Opening the panel moves focus to the new-label input.
  useEffect(() => {
    newLabelInputRef.current?.focus();
  }, [newLabelInputRef]);

  function changeRowMode(next: LabelRowMode | null) {
    onClearError();
    setRowMode(next);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;
    const created = await onCreate({ name, color });
    if (created) {
      setName('');
      setChosenColor(null);
    }
  }

  async function handleUpdate(id: string, input: UpdateLabelInput) {
    if ((await onUpdate(id, input)) !== null) setRowMode(null);
  }

  async function handleRemove(id: string) {
    if (await onRemove(id)) setRowMode(null);
  }

  return (
    <section
      id={LABEL_MANAGER_ID}
      className="label-manager"
      aria-labelledby="label-manager-heading"
      data-testid="label-manager"
    >
      <header className="label-manager__header">
        <h3 id="label-manager-heading">Labels</h3>
        <span className="counter" data-testid="label-count">
          {labels.length} of {LABELS_MAX}
        </span>
      </header>

      <form className="label-manager__create" onSubmit={handleCreate} aria-label="Create a label">
        <label htmlFor="new-label-name" className="visually-hidden">
          New label name
        </label>
        <input
          id="new-label-name"
          ref={newLabelInputRef}
          className="todo-form__input label-input"
          placeholder="New label name"
          value={name}
          maxLength={LABEL_NAME_MAX_LENGTH}
          disabled={atLimit}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          data-testid="new-label-input"
        />
        <LabelColorPicker
          name="new-label-color"
          value={color}
          onChange={setChosenColor}
          disabled={atLimit || busy}
        />
        <button
          type="submit"
          className="button button--primary button--small"
          disabled={!canCreate}
          data-testid="create-label-button"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>

      {atLimit && (
        <p className="label-manager__hint" data-testid="label-limit">
          {LABEL_LIMIT_MESSAGE}
        </p>
      )}

      {error && (
        <p className="error-banner" role="alert" data-testid="label-error">
          {error}
        </p>
      )}

      {labels.length === 0 ? (
        <p className="empty-state empty-state--small" data-testid="labels-empty-state">
          No labels yet. Create your first label above.
        </p>
      ) : (
        <ul className="label-rows">
          {labels.map((label) => (
            <LabelManagerRow
              key={label.id}
              label={label}
              usage={usageCounts.get(label.id) ?? 0}
              mode={rowMode?.labelId === label.id ? rowMode.kind : null}
              pending={pending}
              onModeChange={(kind) => changeRowMode(kind ? { kind, labelId: label.id } : null)}
              onUpdate={(input) => handleUpdate(label.id, input)}
              onRemove={() => handleRemove(label.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
