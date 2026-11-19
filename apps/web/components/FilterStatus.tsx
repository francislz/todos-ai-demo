'use client';

interface FilterSummaryProps {
  visible: number;
  total: number;
  onClear: () => void;
}

/** "Showing X of Y todos" with Clear filter, shown while a filter is active. */
export function FilterSummary({ visible, total, onClear }: FilterSummaryProps) {
  return (
    <div className="filter-summary" role="status" data-testid="filter-summary">
      <span>
        Showing {visible} of {total} todos
      </span>
      <ClearFilterButton onClear={onClear} />
    </div>
  );
}

interface FilterNoticeProps {
  title: string;
  onClear: () => void;
}

/** Shown after adding a todo that the active filter hides. */
export function FilterNotice({ title, onClear }: FilterNoticeProps) {
  return (
    <p className="filter-notice" role="status" data-testid="filter-notice">
      &quot;{title}&quot; was added but is hidden by the current filter.{' '}
      <ClearFilterButton onClear={onClear} />
    </p>
  );
}

export function ClearFilterButton({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      className="link-button"
      onClick={onClear}
      data-testid="label-filter-clear"
    >
      Clear filter
    </button>
  );
}
