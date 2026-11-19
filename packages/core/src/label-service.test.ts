import { beforeEach, describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  LabelLimitReachedError,
  LabelNameTakenError,
  LabelNotFoundError,
  ValidationError,
} from './errors';
import { LABELS_MAX } from './label';
import { LabelService } from './label-service';
import { InMemoryTodoStore } from './store/in-memory-todo-store';
import { TodoService } from './todo-service';

function createServices() {
  let tick = 0;
  let nextId = 0;
  const store = new InMemoryTodoStore();
  const deps = {
    store,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)),
    generateId: () => `id-${++nextId}`,
  };
  return { store, labels: new LabelService(deps), todos: new TodoService(deps) };
}

describe('LabelService', () => {
  let store: InMemoryTodoStore;
  let labels: LabelService;
  let todos: TodoService;

  beforeEach(() => {
    ({ store, labels, todos } = createServices());
  });

  describe('create', () => {
    it('creates a label with a normalized name, preserving its casing', async () => {
      const label = await labels.create({ name: '  Vacation   prep ', color: 'orange' });

      expect(label).toEqual({
        id: 'id-1',
        name: 'Vacation prep',
        color: 'orange',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(await labels.list()).toEqual([label]);
    });

    it('picks the least-used color when none is given (the first label is gray)', async () => {
      expect((await labels.create({ name: 'a' })).color).toBe('gray');
      expect((await labels.create({ name: 'b' })).color).toBe('red');
      await labels.create({ name: 'c', color: 'orange' });
      expect((await labels.create({ name: 'd' })).color).toBe('yellow');
    });

    it('rejects a name taken in another casing, quoting the existing name', async () => {
      await labels.create({ name: 'Vacation prep' });

      await expect(labels.create({ name: 'VACATION PREP' })).rejects.toThrow(
        new LabelNameTakenError('Vacation prep'),
      );
      await expect(labels.create({ name: 'vacation prep' })).rejects.toMatchObject({
        code: ERROR_CODES.LABEL_NAME_TAKEN,
        message: 'A label named "Vacation prep" already exists.',
      });
    });

    it(`rejects label number ${LABELS_MAX + 1}, before reporting a name clash`, async () => {
      for (let i = 0; i < LABELS_MAX; i++) await labels.create({ name: `label ${i}` });

      await expect(labels.create({ name: 'one too many' })).rejects.toBeInstanceOf(
        LabelLimitReachedError,
      );
      await expect(labels.create({ name: 'label 0' })).rejects.toMatchObject({
        code: ERROR_CODES.LABEL_LIMIT_REACHED,
        message: `You can have at most ${LABELS_MAX} labels. Delete one to create another.`,
      });
      expect(await labels.list()).toHaveLength(LABELS_MAX);
    });

    it('rejects invalid input', async () => {
      await expect(labels.create({ name: '#urgent' })).rejects.toBeInstanceOf(ValidationError);
      await expect(labels.create({ name: 'ok', color: 'pink' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('list', () => {
    it('returns labels alphabetically, case-insensitively', async () => {
      await labels.create({ name: 'work' });
      await labels.create({ name: 'Personal' });
      await labels.create({ name: 'travel' });

      expect((await labels.list()).map((label) => label.name)).toEqual([
        'Personal',
        'travel',
        'work',
      ]);
    });
  });

  describe('update', () => {
    it('renames a label to another casing of its own name, keeping its id', async () => {
      const label = await labels.create({ name: 'work', color: 'purple' });

      const renamed = await labels.update(label.id, { name: 'Work' });

      expect(renamed).toEqual({ ...label, name: 'Work' });
    });

    it("rejects a rename to another label's name in any casing", async () => {
      await labels.create({ name: 'Personal' });
      const work = await labels.create({ name: 'work' });

      await expect(labels.update(work.id, { name: 'PERSONAL' })).rejects.toThrow(
        new LabelNameTakenError('Personal'),
      );
      expect((await labels.list()).find((label) => label.id === work.id)?.name).toBe('work');
    });

    it('recolors a label without touching its name', async () => {
      const label = await labels.create({ name: 'travel', color: 'blue' });

      expect(await labels.update(label.id, { color: 'teal' })).toEqual({
        ...label,
        color: 'teal',
      });
    });

    it('keeps todos pointing at the label after a rename', async () => {
      const label = await labels.create({ name: 'travel' });
      const todo = await todos.create({ title: 'Pack', labelIds: [label.id] });

      await labels.update(label.id, { name: 'trips' });

      expect((await todos.list())[0]).toEqual(todo);
    });

    it('validates the body before looking the label up', async () => {
      await expect(labels.update('nope', {})).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws LABEL_NOT_FOUND for an unknown id', async () => {
      await expect(labels.update('nope', { color: 'red' })).rejects.toThrow(
        new LabelNotFoundError('nope'),
      );
    });
  });

  describe('remove', () => {
    it('removes the label from every todo and leaves other labels and todos untouched', async () => {
      const travel = await labels.create({ name: 'travel' });
      const work = await labels.create({ name: 'work' });
      const a = await todos.create({ title: 'a', labelIds: [travel.id, work.id] });
      const b = await todos.create({ title: 'b', labelIds: [travel.id] });
      const c = await todos.create({ title: 'c' });

      await labels.remove(travel.id);

      expect(await labels.list()).toEqual([work]);
      const byId = new Map((await todos.list()).map((todo) => [todo.id, todo]));
      expect(byId.get(a.id)).toEqual({ ...a, labelIds: [work.id] });
      expect(byId.get(b.id)).toEqual({ ...b, labelIds: [] });
      expect(byId.get(c.id)).toEqual(c);
    });

    it('throws LABEL_NOT_FOUND for an unknown id, including a second delete', async () => {
      const label = await labels.create({ name: 'once' });
      await labels.remove(label.id);

      await expect(labels.remove(label.id)).rejects.toMatchObject({
        code: ERROR_CODES.LABEL_NOT_FOUND,
        message: `Label "${label.id}" was not found.`,
      });
      expect((await store.read()).labels).toEqual([]);
    });
  });
});
