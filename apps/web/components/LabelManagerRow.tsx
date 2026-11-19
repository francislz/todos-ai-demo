'use client';

import {
  LABEL_NAME_MAX_LENGTH,
  type Label,
  type LabelColor,
  type UpdateLabelInput,
} from '@todos/core/client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LABEL_ACTIONS, type PendingLabelAction } from '@/hooks/useLabels';
import { LabelChip } from './LabelChip';
import { LabelColorPicker } from './LabelColorPicker';

export const LABEL_ROW_MODES = { edit: 'edit', confirmDelete: 'confirm-delete' } as const;
export type LabelRowModeKind = (typeof LABEL_ROW_MODES)[keyof typeof LABEL_ROW_MODES];

/** The single row in edit or delete-confirmation mode. */
export interface LabelRowMode {
  kind: LabelRowModeKind;
  labelId: string;
}

interface LabelManagerRowProps {
  label: Label;
  /** Number of todos using this label. */
  usage: number;
  mode: LabelRowModeKind | null;
  pending: PendingLabelAction | null;
  onModeChange: (mode: LabelRowModeKind | null) => void;
  onUpdate: (input: UpdateLabelInput) => void;
  onRemove: () => void;
}

export function usageText(count: number): string {
  if (count === 0) return 'Not used';
  return count === 1 ? '1 todo' : `${count} todos`;
}

export function deleteConsequenceText(count: number): string {
  if (count === 0) return 'It is not used by any todo.';
  const todos = count === 1 ? '1 todo' : `${count} todos`;
  return `It will be removed from ${todos}. The todos are kept.`;
}

export function LabelManagerRow({
  label,
  usage,
  mode,
  pending,
  onModeChange,
  onUpdate,
  onRemove,
}: LabelManagerRowProps) {
  const busy = pending !== null;

  if (mode === LABEL_ROW_MODES.edit) {
    return (
      <LabelEditRow
        label={label}
        busy={busy}
        saving={pending?.kind === LABEL_ACTIONS.update && pending.labelId === label.id}
        onCancel={() => onModeChange(null)}
        onSave={onUpdate}
      />
    );
  }

  if (mode === LABEL_ROW_MODES.confirmDelete) {
    return (
      <LabelDeleteRow
        label={label}
        usage={usage}
        busy={busy}
        deleting={pending?.kind === LABEL_ACTIONS.remove && pending.labelId === label.id}
        onCancel={() => onModeChange(null)}
        onConfirm={onRemove}
      />
    );
  }

  return (
    <li className="label-row" data-testid="label-row" data-label-id={label.id}>
      <LabelChip label={label} />
      <span className="label-row__usage" data-testid="label-usage">
        {usageText(usage)}
      </span>
      <span className="label-row__actions">
        <button
          type="button"
          className="button button--secondary button--small"
          aria-label={`Edit label "${label.name}"`}
          disabled={busy}
          onClick={() => onModeChange(LABEL_ROW_MODES.edit)}
          data-testid="label-edit"
        >
          Edit
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          aria-label={`Delete label "${label.name}"`}
          disabled={busy}
          onClick={() => onModeChange(LABEL_ROW_MODES.confirmDelete)}
          data-testid="label-delete"
        >
          Delete
        </button>
      </span>
    </li>
  );
}

interface LabelEditRowProps {
  label: Label;
  busy: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: UpdateLabelInput) => void;
}

function LabelEditRow({ label, busy, saving, onCancel, onSave }: LabelEditRowProps) {
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState<LabelColor>(label.color);
  const inputRef = useRef<HTMLInputElement>(null);
  const canSave = name.trim().length > 0 && !busy;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const input: UpdateLabelInput = {};
    if (name !== label.name) input.name = name;
    if (color !== label.color) input.color = color;
    if (input.name === undefined && input.color === undefined) onCancel();
    else onSave(input);
  }

  return (
    <li className="label-row label-row--editing" data-testid="label-row" data-label-id={label.id}>
      <form
        className="label-row__form"
        onSubmit={handleSubmit}
        aria-label={`Edit label "${label.name}"`}
      >
        <label htmlFor={`label-name-${label.id}`} className="visually-hidden">
          Label name
        </label>
        <input
          id={`label-name-${label.id}`}
          ref={inputRef}
          className="todo-form__input label-input"
          value={name}
          maxLength={LABEL_NAME_MAX_LENGTH}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          data-testid="label-name-input"
        />
        <LabelColorPicker
          name={`label-color-${label.id}`}
          value={color}
          onChange={setColor}
          disabled={busy}
        />
        <span className="label-row__actions">
          <button
            type="button"
            className="button button--secondary button--small"
            disabled={busy}
            onClick={onCancel}
            data-testid="label-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button--primary button--small"
            disabled={!canSave}
            data-testid="label-save"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </span>
      </form>
    </li>
  );
}

interface LabelDeleteRowProps {
  label: Label;
  usage: number;
  busy: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function LabelDeleteRow({
  label,
  usage,
  busy,
  deleting,
  onCancel,
  onConfirm,
}: LabelDeleteRowProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <li className="label-row label-row--confirm" data-testid="label-row" data-label-id={label.id}>
      <span className="label-row__message" data-testid="label-delete-message">
        <b>Delete &quot;{label.name}&quot;?</b> {deleteConsequenceText(usage)}
      </span>
      <span className="label-row__actions">
        <button
          ref={cancelRef}
          type="button"
          className="button button--secondary button--small"
          disabled={busy}
          onClick={onCancel}
          data-testid="label-delete-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          className="button button--danger button--small"
          disabled={busy}
          onClick={onConfirm}
          data-testid="label-delete-confirm"
        >
          {deleting ? 'Deleting…' : 'Delete label'}
        </button>
      </span>
    </li>
  );
}
