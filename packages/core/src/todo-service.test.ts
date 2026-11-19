import { beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODES, TodoNotFoundError, ValidationError } from './errors';
import { InMemoryTodoStore } from './store/in-memory-todo-store';
import { TODO_TITLE_MAX_LENGTH } from './todo';
import { TodoService } from './todo-service';

function createService() {
  let tick = 0;
  let nextId = 0;
  const store = new InMemoryTodoStore();
  const service = new TodoService({
    store,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)),
    generateId: () => `todo-${++nextId}`,
  });
  return { service, store };
}

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(() => {
    ({ service } = createService());
  });

  describe('create', () => {
    it('creates an open todo with a trimmed title', async () => {
      const todo = await service.create({ title: '  Buy milk  ' });

      expect(todo).toEqual({
        id: 'todo-1',
        title: 'Buy milk',
        completed: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
      });
      expect(await service.list()).toEqual([todo]);
    });

    it.each([
      ['missing body', undefined],
      ['non-string title', { title: 42 }],
      ['blank title', { title: '   ' }],
      ['too long title', { title: 'x'.repeat(TODO_TITLE_MAX_LENGTH + 1) }],
    ])('rejects %s', async (_case, input) => {
      await expect(service.create(input)).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('list', () => {
    it('returns open todos first, newest first within each group', async () => {
      const first = await service.create({ title: 'first' });
      const second = await service.create({ title: 'second' });
      const third = await service.create({ title: 'third' });
      await service.update(third.id, { completed: true });

      const titles = (await service.list()).map((todo) => todo.title);

      expect(titles).toEqual([second.title, first.title, third.title]);
    });
  });

  describe('update', () => {
    it('completes and reopens a todo, tracking completedAt', async () => {
      const todo = await service.create({ title: 'Ship it' });

      const done = await service.update(todo.id, { completed: true });
      expect(done.completed).toBe(true);
      expect(done.completedAt).toBe('2026-01-01T00:00:01.000Z');

      const reopened = await service.update(todo.id, { completed: false });
      expect(reopened.completed).toBe(false);
      expect(reopened.completedAt).toBeNull();
    });

    it('is a no-op when the state does not change', async () => {
      const todo = await service.create({ title: 'Idempotent' });
      expect(await service.update(todo.id, { completed: false })).toEqual(todo);
    });

    it('rejects an invalid body', async () => {
      const todo = await service.create({ title: 'Typed' });
      await expect(service.update(todo.id, { completed: 'yes' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws TODO_NOT_FOUND for an unknown id', async () => {
      await expect(service.update('nope', { completed: true })).rejects.toMatchObject({
        code: ERROR_CODES.TODO_NOT_FOUND,
      });
    });
  });

  describe('remove', () => {
    it('removes a todo', async () => {
      const todo = await service.create({ title: 'Temporary' });
      await service.remove(todo.id);
      expect(await service.list()).toEqual([]);
    });

    it('throws TodoNotFoundError for an unknown id', async () => {
      await expect(service.remove('nope')).rejects.toBeInstanceOf(TodoNotFoundError);
    });
  });
});
