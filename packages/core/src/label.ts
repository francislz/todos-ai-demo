/** Fixed palette. The key is what is stored; the web app maps each key to CSS variables. */
export const LABEL_COLORS = [
  'gray',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

/** A named, colored category that todos reference by id. Dates are ISO-8601 strings. */
export interface Label {
  id: string;
  /** Normalized, 1..LABEL_NAME_MAX_LENGTH characters, display casing preserved. */
  name: string;
  color: LabelColor;
  createdAt: string;
}

export interface CreateLabelInput {
  name: string;
  /** When absent, the service picks suggestLabelColor(existing labels). */
  color?: LabelColor;
}

/** A partial update: absent fields are left untouched. */
export interface UpdateLabelInput {
  name?: string;
  color?: LabelColor;
}

/** Maximum label name length, in UTF-16 code units (the same unit as an input's maxLength). */
export const LABEL_NAME_MAX_LENGTH = 30;

/** Unicode letters and digits, space and - _ & ' . /; the first character is a letter or digit. */
export const LABEL_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} \-_&'./]*$/u;

/** Maximum number of labels in total. */
export const LABELS_MAX = 50;

/** Uniqueness key of a label name: two labels may not share it ("Work" equals "work"). */
export function labelNameKey(name: string): string {
  return name.normalize('NFC').toLowerCase();
}

/**
 * Alphabetical order by labelNameKey, using plain code-unit comparison so server and browser agree
 * (no locale tables). Returns a new array.
 */
export function sortLabels(labels: readonly Label[]): Label[] {
  return [...labels].sort(
    (a, b) =>
      compareCodeUnits(labelNameKey(a.name), labelNameKey(b.name)) || compareCodeUnits(a.id, b.id),
  );
}

/** The palette color used by the fewest labels; ties go to palette order (so the first label is gray). */
export function suggestLabelColor(labels: readonly Pick<Label, 'color'>[]): LabelColor {
  const usage = new Map<LabelColor, number>(LABEL_COLORS.map((color) => [color, 0]));
  for (const { color } of labels) usage.set(color, (usage.get(color) ?? 0) + 1);

  let suggested: LabelColor = LABEL_COLORS[0];
  for (const color of LABEL_COLORS) {
    if ((usage.get(color) ?? 0) < (usage.get(suggested) ?? 0)) suggested = color;
  }
  return suggested;
}

function compareCodeUnits(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
