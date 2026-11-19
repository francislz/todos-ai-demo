import { describe, expect, it } from 'vitest';
import {
  LABEL_COLORS,
  labelNameKey,
  sortLabels,
  suggestLabelColor,
  type Label,
  type LabelColor,
} from './label';

function makeLabel(id: string, name: string, color: LabelColor = 'gray'): Label {
  return { id, name, color, createdAt: '2026-01-01T00:00:00.000Z' };
}

describe('labelNameKey', () => {
  it('ignores casing', () => {
    expect(labelNameKey('Work')).toBe(labelNameKey('work'));
  });

  it('treats composed and decomposed forms as equal (NFC)', () => {
    expect(labelNameKey('Férias')).toBe(labelNameKey('Férias'));
  });
});

describe('sortLabels', () => {
  it('sorts by name case-insensitively, by code unit, without mutating the input', () => {
    const labels = [
      makeLabel('1', 'work'),
      makeLabel('2', 'Férias'),
      makeLabel('3', 'personal'),
      makeLabel('4', 'Zoo'),
      makeLabel('5', '2026'),
      makeLabel('6', 'Éclair'),
    ];

    const sorted = sortLabels(labels);

    // Code-unit order: digits, then a-z; a leading accented letter sorts after z.
    expect(sorted.map((label) => label.name)).toEqual([
      '2026',
      'Férias',
      'personal',
      'work',
      'Zoo',
      'Éclair',
    ]);
    expect(labels.map((label) => label.id)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
});

describe('suggestLabelColor', () => {
  it('returns gray for an empty list', () => {
    expect(suggestLabelColor([])).toBe('gray');
  });

  it('returns the least-used color', () => {
    const used = LABEL_COLORS.filter((color) => color !== 'teal').map((color) => ({ color }));
    expect(suggestLabelColor(used)).toBe('teal');
  });

  it('breaks ties by palette order', () => {
    expect(suggestLabelColor([{ color: 'gray' }, { color: 'orange' }])).toBe('red');
    expect(suggestLabelColor(LABEL_COLORS.map((color) => ({ color })))).toBe('gray');
  });
});
