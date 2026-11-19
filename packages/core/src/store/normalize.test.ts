import { describe, expect, it } from 'vitest';
import { normalizeStoreData } from './normalize';
import { makeStoredLabel, makeStoredTodo } from './todo-store-contract';

describe('normalizeStoreData', () => {
  const malformedEntries = [null, 42, 'oops', true, ['nested']];

  it.each([undefined, null, 'text', 7, []])('reads %j as an empty store', (raw) => {
    expect(normalizeStoreData(raw)).toEqual({ todos: [], labels: [] });
  });

  it('drops non-object entries in todos', () => {
    const todo = makeStoredTodo('a');
    expect(normalizeStoreData({ todos: [...malformedEntries, todo] })).toEqual({
      todos: [todo],
      labels: [],
    });
  });

  it('drops non-object entries in labels', () => {
    const label = makeStoredLabel('l1');
    expect(normalizeStoreData({ labels: [null, label, 3, 'x', [label]] })).toEqual({
      todos: [],
      labels: [label],
    });
  });

  it('keeps label ids that still match a well-formed label', () => {
    const raw = {
      labels: [null, makeStoredLabel('l1'), 'l2'],
      todos: [makeStoredTodo('a', { labelIds: ['l1', 'l2'] })],
    };
    expect(normalizeStoreData(raw).todos[0]?.labelIds).toEqual(['l1']);
  });

  it('does not mutate its input', () => {
    const raw = { todos: [null, makeStoredTodo('a')], labels: [1, makeStoredLabel('l1')] };
    const snapshot = structuredClone(raw);
    normalizeStoreData(raw);
    expect(raw).toEqual(snapshot);
  });
});
