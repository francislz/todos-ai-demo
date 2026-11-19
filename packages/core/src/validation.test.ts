import { describe, expect, it } from 'vitest';
import { ValidationError } from './errors';
import { LABEL_NAME_MAX_LENGTH } from './label';
import { TODO_LABELS_MAX } from './todo';
import {
  normalizeLabelName,
  parseCreateLabelInput,
  parseCreateTodoInput,
  parseLabelIds,
  parseUpdateLabelInput,
  parseUpdateTodoInput,
} from './validation';

const NAME_CHARACTERS_MESSAGE =
  '"name" must start with a letter or digit and may only contain letters, digits, spaces and - _ & \' . /';

function expectValidationError(run: () => unknown, message: string): void {
  expect(run).toThrow(new ValidationError(message));
  expect(run).toThrow(ValidationError);
}

const ids = (count: number) => Array.from({ length: count }, (_, i) => `id-${i}`);

describe('parseLabelIds', () => {
  it('removes duplicates, keeping the first occurrence and the order sent', () => {
    expect(parseLabelIds(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });

  it('accepts an empty array', () => {
    expect(parseLabelIds([])).toEqual([]);
  });

  it.each([
    ['a string', 'id-1'],
    ['null', null],
    ['an object', { 0: 'id-1' }],
    ['an array with a number', ['id-1', 2]],
  ])('rejects %s', (_case, value) => {
    expectValidationError(() => parseLabelIds(value), '"labelIds" must be an array of strings.');
  });

  it(`accepts ${TODO_LABELS_MAX} labels, also after de-duplication`, () => {
    expect(parseLabelIds(ids(TODO_LABELS_MAX))).toHaveLength(TODO_LABELS_MAX);
    expect(parseLabelIds([...ids(TODO_LABELS_MAX), 'id-0'])).toHaveLength(TODO_LABELS_MAX);
  });

  it(`rejects more than ${TODO_LABELS_MAX} labels`, () => {
    expectValidationError(
      () => parseLabelIds(ids(TODO_LABELS_MAX + 1)),
      `"labelIds" must contain at most ${TODO_LABELS_MAX} labels.`,
    );
  });
});

describe('parseCreateTodoInput', () => {
  it('defaults labelIds to []', () => {
    expect(parseCreateTodoInput({ title: ' Plan ' })).toEqual({ title: 'Plan', labelIds: [] });
  });

  it('parses labelIds and ignores unknown fields', () => {
    expect(parseCreateTodoInput({ title: 'Plan', labelIds: ['a', 'a'], extra: 1 })).toEqual({
      title: 'Plan',
      labelIds: ['a'],
    });
  });

  it('keeps the existing title rules', () => {
    expectValidationError(
      () => parseCreateTodoInput(undefined),
      '"title" is required and must be a string.',
    );
    expectValidationError(() => parseCreateTodoInput({ title: ' ' }), '"title" must not be empty.');
  });

  it('rejects invalid labelIds', () => {
    expectValidationError(
      () => parseCreateTodoInput({ title: 'Plan', labelIds: null }),
      '"labelIds" must be an array of strings.',
    );
  });
});

describe('parseUpdateTodoInput', () => {
  it.each([
    ['only completed', { completed: true }, { completed: true }],
    ['only labelIds', { labelIds: ['a'] }, { labelIds: ['a'] }],
    ['both', { completed: false, labelIds: [] }, { completed: false, labelIds: [] }],
  ])('accepts %s', (_case, input, expected) => {
    expect(parseUpdateTodoInput(input)).toEqual(expected);
  });

  it.each([
    ['neither field', {}],
    ['only unknown fields', { title: 'x' }],
    ['a non-object body', 'completed'],
    ['an array body', [true]],
    ['no body', undefined],
  ])('rejects %s', (_case, input) => {
    expectValidationError(
      () => parseUpdateTodoInput(input),
      'Provide at least one of "completed" or "labelIds".',
    );
  });

  it('rejects a non-boolean completed', () => {
    expectValidationError(
      () => parseUpdateTodoInput({ completed: 'yes', labelIds: [] }),
      '"completed" must be a boolean.',
    );
    expectValidationError(
      () => parseUpdateTodoInput({ completed: null }),
      '"completed" must be a boolean.',
    );
  });

  it('rejects invalid labelIds', () => {
    expectValidationError(
      () => parseUpdateTodoInput({ completed: true, labelIds: 'a' }),
      '"labelIds" must be an array of strings.',
    );
  });
});

describe('normalizeLabelName', () => {
  it('trims and collapses inner whitespace', () => {
    expect(normalizeLabelName('  Vacation   prep ')).toBe('Vacation prep');
    expect(normalizeLabelName('a\t\nb')).toBe('a b');
  });

  it('applies Unicode NFC', () => {
    expect(normalizeLabelName('Férias')).toBe('Férias');
  });

  it('preserves casing', () => {
    expect(normalizeLabelName('R&D Team')).toBe('R&D Team');
  });
});

describe('parseCreateLabelInput', () => {
  it('normalizes the name and omits an absent color', () => {
    expect(parseCreateLabelInput({ name: '  Vacation   prep ' })).toEqual({
      name: 'Vacation prep',
    });
  });

  it('accepts a palette color', () => {
    expect(parseCreateLabelInput({ name: 'work', color: 'purple' })).toEqual({
      name: 'work',
      color: 'purple',
    });
  });

  it.each(['work', 'vacation-prep', 'R&D', 'Q3/2026', "Mom's stuff", 'Férias', '2026', 'a_b.c'])(
    'accepts the name %j',
    (name) => {
      expect(parseCreateLabelInput({ name }).name).toBe(name);
    },
  );

  it.each(['-work', '#urgent', 'a,b', 'party 🎉', '🎉', 'tab\u0007bell', '.hidden'])(
    'rejects the name %j',
    (name) => {
      expectValidationError(() => parseCreateLabelInput({ name }), NAME_CHARACTERS_MESSAGE);
    },
  );

  it.each([
    ['a missing body', undefined],
    ['a missing name', {}],
    ['a non-string name', { name: 42 }],
  ])('rejects %s', (_case, input) => {
    expectValidationError(
      () => parseCreateLabelInput(input),
      '"name" is required and must be a string.',
    );
  });

  it('rejects an empty name after normalization', () => {
    expectValidationError(
      () => parseCreateLabelInput({ name: '   ' }),
      '"name" must not be empty.',
    );
  });

  it(`accepts ${LABEL_NAME_MAX_LENGTH} characters and rejects more`, () => {
    const longest = 'x'.repeat(LABEL_NAME_MAX_LENGTH);
    expect(parseCreateLabelInput({ name: `  ${longest}  ` }).name).toBe(longest);
    expectValidationError(
      () => parseCreateLabelInput({ name: `${longest}x` }),
      `"name" must be at most ${LABEL_NAME_MAX_LENGTH} characters.`,
    );
  });

  it.each(['pink', '#ff0000', 'Gray', null, 3])('rejects the color %j', (color) => {
    expectValidationError(
      () => parseCreateLabelInput({ name: 'work', color }),
      '"color" must be one of: gray, red, orange, yellow, green, teal, blue, purple.',
    );
  });
});

describe('parseUpdateLabelInput', () => {
  it.each([
    ['only name', { name: ' Work ' }, { name: 'Work' }],
    ['only color', { color: 'teal' }, { color: 'teal' }],
    ['both', { name: 'w', color: 'red' }, { name: 'w', color: 'red' }],
  ])('accepts %s', (_case, input, expected) => {
    expect(parseUpdateLabelInput(input)).toEqual(expected);
  });

  it.each([
    ['neither field', {}],
    ['a non-object body', 'name'],
    ['no body', undefined],
  ])('rejects %s', (_case, input) => {
    expectValidationError(
      () => parseUpdateLabelInput(input),
      'Provide at least one of "name" or "color".',
    );
  });

  it('applies the name and color rules', () => {
    expectValidationError(() => parseUpdateLabelInput({ name: '' }), '"name" must not be empty.');
    expectValidationError(
      () => parseUpdateLabelInput({ color: 'pink' }),
      '"color" must be one of: gray, red, orange, yellow, green, teal, blue, purple.',
    );
  });
});
