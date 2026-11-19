import { beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODES, TodoNotFoundError, ValidationError } from './errors';
import type { Label } from './label';
import { InMemoryTodoStore } from './store/in-memory-todo-store';
import { TODO_TITLE_MAX_LENGTH } from './todo';
import { TodoService } from './todo-service';

function makeLabel(id: string): Label {
  return { id, name: id, color: 'gray', createdAt: '2025-12-31T00:00:00.000Z' };
}

function createService(labels: Label[] = []) {
  let tick = 0;
  let nextId = 0;
  const store = new InMemoryTodoStore({ labels });
  const service = new TodoService({
    store,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)),
    generateId: () => `todo-${++nextId}`,
  });
  return { service, store };
}

describe('TodoService', () => {
  let service: TodoService;
  let store: InMemoryTodoStore;

  beforeEach(() => {
    ({ service, store } = createService([makeLabel('work'), makeLabel('home')]));
  });

  describe('create', () => {
    it('creates an open, unlabelled todo with a trimmed title', async () => {
      const todo = await service.create({ title: '  Buy milk  ' });

      expect(todo).toEqual({
        id: 'todo-1',
        title: 'Buy milk',
        completed: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
        labelIds: [],
      });
      expect(await service.list()).toEqual([todo]);
    });

    it('creates a todo with labels, de-duplicated, in the order sent', async () => {
      const todo = await service.create({ title: 'Plan', labelIds: ['home', 'work', 'home'] });

      expect(todo.labelIds).toEqual(['home', 'work']);
      expect((await service.list())[0]?.labelIds).toEqual(['home', 'work']);
    });

    it('rejects an unknown label id and writes nothing', async () => {
      await expect(service.create({ title: 'Plan', labelIds: ['work', 'gone'] })).rejects.toThrow(
        new ValidationError('Unknown label id "gone". The label may have been deleted.'),
      );
      expect((await store.read()).todos).toEqual([]);
    });

    it.each([
      ['missing body', undefined],
      ['non-string title', { title: 42 }],
      ['blank title', { title: '   ' }],
      ['too long title', { title: 'x'.repeat(TODO_TITLE_MAX_LENGTH + 1) }],
      ['non-array labelIds', { title: 'ok', labelIds: 'work' }],
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
      const todo = await service.create({ title: 'Idempotent', labelIds: ['work'] });
      expect(await service.update(todo.id, { completed: false, labelIds: ['work'] })).toEqual(todo);
    });

    it('with only labelIds, keeps completed and completedAt', async () => {
      const todo = await service.create({ title: 'Labelled later' });
      const done = await service.update(todo.id, { completed: true });

      const labelled = await service.update(todo.id, { labelIds: ['work'] });

      expect(labelled).toEqual({ ...done, labelIds: ['work'] });
    });

    it('with only completed, keeps the labels', async () => {
      const todo = await service.create({ title: 'Keep labels', labelIds: ['work', 'home'] });

      const done = await service.update(todo.id, { completed: true });

      expect(done.labelIds).toEqual(['work', 'home']);
    });

    it('replaces the whole label set, and [] clears it', async () => {
      const todo = await service.create({ title: 'Relabel', labelIds: ['work'] });

      expect((await service.update(todo.id, { labelIds: ['home'] })).labelIds).toEqual(['home']);
      expect((await service.update(todo.id, { labelIds: [] })).labelIds).toEqual([]);
      expect((await service.list())[0]?.labelIds).toEqual([]);
    });

    it('updates both fields at once', async () => {
      const todo = await service.create({ title: 'Both' });

      const updated = await service.update(todo.id, { completed: true, labelIds: ['home'] });

      expect(updated).toMatchObject({ completed: true, labelIds: ['home'] });
    });

    it('rejects an unknown label id and leaves the todo unchanged', async () => {
      const todo = await service.create({ title: 'Guarded', labelIds: ['work'] });

      await expect(
        service.update(todo.id, { completed: true, labelIds: ['gone'] }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Unknown label id "gone". The label may have been deleted.',
      });
      expect((await service.list())[0]).toEqual(todo);
    });

    it.each([
      ['neither field', {}],
      ['a non-boolean completed', { completed: 'yes' }],
      ['non-string label ids', { labelIds: [1] }],
    ])('rejects %s', async (_case, input) => {
      const todo = await service.create({ title: 'Typed' });
      await expect(service.update(todo.id, input)).rejects.toBeInstanceOf(ValidationError);
    });

    it('validates the body before looking the todo up', async () => {
      await expect(service.update('nope', {})).rejects.toBeInstanceOf(ValidationError);
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
