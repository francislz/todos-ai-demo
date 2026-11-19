import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '../errors';
import type { Label } from '../label';
import { LabelService } from '../label-service';
import { TodoService } from '../todo-service';
import type { Todo } from '../todo';
import type { TodoStore } from './todo-store';

export function makeStoredTodo(id: string, overrides: Partial<Todo> = {}): Todo {
  return {
    id,
    title: `Todo ${id}`,
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    labelIds: [],
    ...overrides,
  };
}

export function makeStoredLabel(id: string, overrides: Partial<Label> = {}): Label {
  return {
    id,
    name: `label ${id}`,
    color: 'gray',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Behavior every TodoStore implementation must have. `createStore` returns a fresh, empty store. */
export function describeTodoStoreContract(name: string, createStore: () => TodoStore): void {
  describe(`${name} (TodoStore contract)`, () => {
    it('starts empty', async () => {
      expect(await createStore().read()).toEqual({ todos: [], labels: [] });
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
      returned.labelIds.push('shared-array');
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

    it('persists labels and the todos that reference them together', async () => {
      const store = createStore();
      await store.transaction((draft) => {
        draft.labels.push(makeStoredLabel('l1'));
        draft.todos.push(makeStoredTodo('a', { labelIds: ['l1'] }));
      });

      expect(await store.read()).toEqual({
        labels: [makeStoredLabel('l1')],
        todos: [makeStoredTodo('a', { labelIds: ['l1'] })],
      });
    });

    it('lets only one of two concurrent creates of the same label name succeed', async () => {
      const service = new LabelService({ store: createStore() });

      const results = await Promise.allSettled([
        service.create({ name: 'Work' }),
        service.create({ name: 'work' }),
      ]);

      expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
      const rejected = results.find((result) => result.status === 'rejected');
      expect(rejected?.reason).toMatchObject({ code: ERROR_CODES.LABEL_NAME_TAKEN });
      expect(await service.list()).toHaveLength(1);
    });

    it('never leaves a dangling label id when a label delete races a todo update', async () => {
      const store = createStore();
      await store.transaction((draft) => {
        draft.labels.push(makeStoredLabel('l1'));
        draft.todos.push(makeStoredTodo('a'));
      });
      const todoService = new TodoService({ store });
      const labelService = new LabelService({ store });

      await Promise.allSettled([
        todoService.update('a', { labelIds: ['l1'] }),
        labelService.remove('l1'),
      ]);

      const data = await store.read();
      expect(data.labels).toEqual([]);
      expect(data.todos[0]?.labelIds).toEqual([]);
    });
  });
}
