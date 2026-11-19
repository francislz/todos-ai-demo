import { describe, expect, it } from 'vitest';
import { InMemoryTodoStore } from './in-memory-todo-store';
import { describeTodoStoreContract, makeStoredTodo } from './todo-store-contract';

describeTodoStoreContract('InMemoryTodoStore', () => new InMemoryTodoStore());

describe('InMemoryTodoStore', () => {
  it('starts from a seed without sharing it', async () => {
    const seed = { todos: [makeStoredTodo('a')] };
    const store = new InMemoryTodoStore(seed);

    seed.todos[0]!.title = 'mutated after seeding';

    expect((await store.read()).todos).toEqual([makeStoredTodo('a')]);
  });
});
