'use client';

import type { Label } from '@todos/core/client';
import type { LabelFilter } from '@/lib/label-filter';

export const LABEL_MANAGER_ID = 'label-manager';

interface LabelFilterBarProps {
  /** Sorted by name. */
  labels: readonly Label[];
  filter: LabelFilter;
  onToggleLabel: (labelId: string) => void;
  onToggleNoLabel: () => void;
  managerOpen: boolean;
  onToggleManager: () => void;
}

function FilterChipMark({ pressed }: { pressed: boolean }) {
  return pressed ? (
    <span className="filter-chip__check" aria-hidden="true">
      ✓
    </span>
  ) : (
    <span className="filter-chip__dot" aria-hidden="true" />
  );
}

/** Filter chips (OR) on the left, the Manage labels toggle on the right. */
export function LabelFilterBar({
  labels,
  filter,
  onToggleLabel,
  onToggleNoLabel,
  managerOpen,
  onToggleManager,
}: LabelFilterBarProps) {
  return (
    <div className="labels-bar">
      {labels.length === 0 ? (
        <div className="labels-bar__filters">
          <span className="labels-bar__empty">No labels yet.</span>
        </div>
      ) : (
        <div
          className="labels-bar__filters"
          role="group"
          aria-label="Filter by label"
          data-testid="label-filter"
        >
          <span className="labels-bar__caption" aria-hidden="true">
            Filter
          </span>
          {labels.map((label) => {
            const pressed = filter.labelIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                className={`filter-chip c-${label.color}${pressed ? ' is-pressed' : ''}`}
                aria-pressed={pressed}
                onClick={() => onToggleLabel(label.id)}
                data-testid="label-filter-option"
                data-label-id={label.id}
                data-color={label.color}
              >
                <FilterChipMark pressed={pressed} />
                <span className="filter-chip__name">{label.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            className={`filter-chip filter-chip--none${filter.noLabel ? ' is-pressed' : ''}`}
            aria-pressed={filter.noLabel}
            onClick={onToggleNoLabel}
            data-testid="label-filter-option"
            data-filter="none"
          >
            {filter.noLabel && <FilterChipMark pressed />}
            No label
          </button>
        </div>
      )}
      <button
        type="button"
        className="button button--secondary button--small"
        aria-expanded={managerOpen}
        aria-controls={LABEL_MANAGER_ID}
        onClick={onToggleManager}
        data-testid="manage-labels-button"
      >
        {managerOpen ? 'Close labels' : 'Manage labels'}
      </button>
    </div>
  );
}
