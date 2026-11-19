import { describe, expect, it } from 'vitest';
import { sortTodos, type Todo } from './todo';

function makeTodo(id: string, createdAt: string, completed = false): Todo {
  return { id, title: id, completed, createdAt, completedAt: null };
}

describe('sortTodos', () => {
  it('puts open todos first, newest first within each group', () => {
    const todos = [
      makeTodo('old-open', '2026-01-01T00:00:00.000Z'),
      makeTodo('new-done', '2026-01-04T00:00:00.000Z', true),
      makeTodo('new-open', '2026-01-03T00:00:00.000Z'),
      makeTodo('old-done', '2026-01-02T00:00:00.000Z', true),
    ];

    expect(sortTodos(todos).map((todo) => todo.id)).toEqual([
      'new-open',
      'old-open',
      'new-done',
      'old-done',
    ]);
  });

  it('returns a new array and leaves the input untouched', () => {
    const todos = [
      makeTodo('a', '2026-01-01T00:00:00.000Z'),
      makeTodo('b', '2026-01-02T00:00:00.000Z'),
    ];

    const sorted = sortTodos(todos);

    expect(sorted).not.toBe(todos);
    expect(todos.map((todo) => todo.id)).toEqual(['a', 'b']);
  });
});
