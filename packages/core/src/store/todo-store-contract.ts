import { describe, expect, it } from 'vitest';
import type { Todo } from '../todo';
import type { TodoStore } from './todo-store';

export function makeStoredTodo(id: string, overrides: Partial<Todo> = {}): Todo {
  return {
    id,
    title: `Todo ${id}`,
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

/** Behavior every TodoStore implementation must have. `createStore` returns a fresh, empty store. */
export function describeTodoStoreContract(name: string, createStore: () => TodoStore): void {
  describe(`${name} (TodoStore contract)`, () => {
    it('starts empty', async () => {
      expect(await createStore().read()).toEqual({ todos: [] });
    });

    it('persists what a transaction does to the draft and returns its result', async () => {
      const store = createStore();

      const result = await store.transaction((draft) => {
        draft.todos.push(makeStoredTodo('a'), makeStoredTodo('b'));
        return draft.todos.length;
      });

      expect(result).toBe(2);
      expect((await store.read()).todos.map((todo) => todo.id)).toEqual(['a', 'b']);
    });

    it('returns snapshots that callers can mutate without affecting the store', async () => {
      const store = createStore();
      const returned = await store.transaction((draft) => {
        const todo = makeStoredTodo('a');
        draft.todos.push(todo);
        return todo;
      });

      returned.title = 'changed through the transaction result';
      const snapshot = await store.read();
      snapshot.todos[0]!.title = 'changed through a snapshot';
      snapshot.todos.push(makeStoredTodo('b'));

      expect((await store.read()).todos).toEqual([makeStoredTodo('a')]);
    });

    it('writes nothing when the transaction throws', async () => {
      const store = createStore();
      await store.transaction((draft) => {
        draft.todos.push(makeStoredTodo('a'));
      });

      await expect(
        store.transaction((draft) => {
          draft.todos.push(makeStoredTodo('b'));
          draft.todos[0]!.completed = true;
          throw new Error('abort');
        }),
      ).rejects.toThrow('abort');

      expect((await store.read()).todos).toEqual([makeStoredTodo('a')]);
    });

    it('keeps working after a failed transaction', async () => {
      const store = createStore();
      await store
        .transaction(() => {
          throw new Error('abort');
        })
        .catch(() => undefined);

      await store.transaction((draft) => {
        draft.todos.push(makeStoredTodo('a'));
      });

      expect((await store.read()).todos).toHaveLength(1);
    });

    it('serializes concurrent transactions without losing writes', async () => {
      const store = createStore();

      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          store.transaction((draft) => {
            draft.todos.push(makeStoredTodo(String(i)));
          }),
        ),
      );

      expect((await store.read()).todos).toHaveLength(20);
    });
  });
}
