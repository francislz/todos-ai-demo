import { describe, expect, it } from 'vitest';
import { InMemoryTodoStore } from './in-memory-todo-store';
import { describeTodoStoreContract, makeStoredLabel, makeStoredTodo } from './todo-store-contract';

describeTodoStoreContract('InMemoryTodoStore', () => new InMemoryTodoStore());

describe('InMemoryTodoStore', () => {
  it('starts from a seed without sharing it', async () => {
    const seed = { todos: [makeStoredTodo('a')] };
    const store = new InMemoryTodoStore(seed);

    seed.todos[0]!.title = 'mutated after seeding';

    expect((await store.read()).todos).toEqual([makeStoredTodo('a')]);
  });

  it('normalizes its seed like a persisted file (dangling label ids dropped)', async () => {
    const store = new InMemoryTodoStore({
      labels: [makeStoredLabel('l1')],
      todos: [makeStoredTodo('a', { labelIds: ['l1', 'ghost'] })],
    });

    expect((await store.read()).todos[0]?.labelIds).toEqual(['l1']);
  });
});
