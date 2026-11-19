'use client';

import { TODO_LABELS_MAX, type Label } from '@todos/core/client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export const LABEL_PICKER_VARIANTS = { todo: 'todo', form: 'form' } as const;
export type LabelPickerVariant = (typeof LABEL_PICKER_VARIANTS)[keyof typeof LABEL_PICKER_VARIANTS];

interface LabelPickerProps {
  /** All labels, sorted by name. */
  labels: readonly Label[];
  selectedIds: readonly string[];
  /** Accessible name of the trigger and of the popover. */
  accessibleName: string;
  triggerTestId: string;
  variant: LabelPickerVariant;
  disabled?: boolean;
  /** Called with the new selection, in label order. Not called on Cancel / Esc / click outside. */
  onApply: (labelIds: string[]) => void;
  /** The empty state's primary button: open the Manage labels panel. */
  onManageLabels: () => void;
}

/**
 * A dashed "+ Label" / "Edit labels" trigger and a non-modal popover with a checklist of every
 * label. Nothing is applied until Apply. The popover is positioned by the nearest positioned
 * ancestor (the todo row or the form labels row).
 */
export function LabelPicker({
  labels,
  selectedIds,
  accessibleName,
  triggerTestId,
  variant,
  disabled,
  onApply,
  onManageLabels,
}: LabelPickerProps) {
  const [draft, setDraft] = useState<ReadonlySet<string> | null>(null);
  const open = draft !== null;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const atLimit = (draft?.size ?? 0) >= TODO_LABELS_MAX;

  function openPicker() {
    const existing = new Set(labels.map((label) => label.id));
    setDraft(new Set(selectedIds.filter((id) => existing.has(id))));
  }

  function close({ returnFocus }: { returnFocus: boolean }) {
    setDraft(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  function toggleOption(id: string) {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    const chosen = labels.filter((label) => draft?.has(label.id)).map((label) => label.id);
    close({ returnFocus: true });
    onApply(chosen);
  }

  function manageLabels() {
    setDraft(null);
    onManageLabels();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close({ returnFocus: true });
    }
  }

  // Focus the first control when opening.
  useEffect(() => {
    if (!open) return;
    const first = popoverRef.current?.querySelector<HTMLElement>('input, button');
    first?.focus();
  }, [open]);

  // A click outside the trigger and the popover discards the draft.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setDraft(null);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="label-add"
        data-testid={triggerTestId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={accessibleName}
        disabled={disabled}
        onClick={() => (open ? close({ returnFocus: false }) : openPicker())}
      >
        {selectedIds.length === 0 ? '+ Label' : 'Edit labels'}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={`label-picker label-picker--${variant}`}
          role="dialog"
          aria-label={accessibleName}
          data-testid="label-picker"
          onKeyDown={handleKeyDown}
        >
          <p className="label-picker__title" id={titleId}>
            Labels
          </p>
          {labels.length === 0 ? (
            <>
              <p className="label-picker__hint" data-testid="label-picker-empty">
                No labels yet.
              </p>
              <div className="label-picker__footer">
                <button
                  type="button"
                  className="button button--secondary button--small"
                  data-testid="label-picker-cancel"
                  onClick={() => close({ returnFocus: true })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button--primary button--small"
                  data-testid="label-picker-manage"
                  onClick={manageLabels}
                >
                  Manage labels
                </button>
              </div>
            </>
          ) : (
            <>
              <fieldset className="label-picker__options" aria-labelledby={titleId}>
                {labels.map((label) => {
                  const checked = draft.has(label.id);
                  return (
                    <label key={label.id} className="label-picker__option">
                      <input
                        type="checkbox"
                        className="label-picker__checkbox"
                        checked={checked}
                        disabled={!checked && atLimit}
                        onChange={() => toggleOption(label.id)}
                        data-testid="label-picker-option"
                        data-label-id={label.id}
                      />
                      <span className={`filter-chip__dot c-${label.color}`} aria-hidden="true" />
                      <span className="label-picker__name">{label.name}</span>
                    </label>
                  );
                })}
              </fieldset>
              {atLimit && (
                <p className="label-picker__hint">Up to {TODO_LABELS_MAX} labels per todo.</p>
              )}
              <div className="label-picker__footer">
                <button
                  type="button"
                  className="button button--secondary button--small"
                  data-testid="label-picker-cancel"
                  onClick={() => close({ returnFocus: true })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button--primary button--small"
                  data-testid="label-picker-apply"
                  onClick={apply}
                >
                  Apply
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
