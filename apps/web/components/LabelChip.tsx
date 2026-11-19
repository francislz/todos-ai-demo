import type { Label } from '@todos/core/client';

interface LabelChipProps {
  label: Label;
  /** `li` inside a chip list, `span` elsewhere. */
  as?: 'li' | 'span';
}

/** A non-interactive colored chip showing a label's name (the name is always visible). */
export function LabelChip({ label, as: Element = 'span' }: LabelChipProps) {
  return (
    <Element
      className={`label-chip c-${label.color}`}
      data-testid="label-chip"
      data-label-id={label.id}
      data-color={label.color}
      title={label.name}
    >
      {label.name}
    </Element>
  );
}

interface LabelChipListProps {
  labels: readonly Label[];
}

/** The chips of a todo or of the add form, as a list named "Labels". */
export function LabelChipList({ labels }: LabelChipListProps) {
  if (labels.length === 0) return null;
  return (
    <ul className="label-chips" aria-label="Labels">
      {labels.map((label) => (
        <LabelChip key={label.id} label={label} as="li" />
      ))}
    </ul>
  );
}
