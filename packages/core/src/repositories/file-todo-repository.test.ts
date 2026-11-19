import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Todo } from '../todo';
import { FileTodoRepository } from './file-todo-repository';

function makeTodo(id: string): Todo {
  return {
    id,
    title: `Todo ${id}`,
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
  };
}

describe('FileTodoRepository', () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'todos-'));
    filePath = join(dir, 'nested', 'todos.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns an empty list when the file does not exist', async () => {
    expect(await new FileTodoRepository(filePath).list()).toEqual([]);
  });

  it('persists inserts, updates and deletes to disk', async () => {
    const repository = new FileTodoRepository(filePath);
    await repository.insert(makeTodo('a'));
    await repository.insert(makeTodo('b'));
    await repository.update({ ...makeTodo('a'), completed: true });

    expect(await repository.delete('b')).toBe(true);
    expect(await repository.delete('missing')).toBe(false);

    const reloaded = new FileTodoRepository(filePath);
    expect(await reloaded.findById('a')).toMatchObject({ id: 'a', completed: true });
    expect(await reloaded.findById('b')).toBeNull();
    expect(JSON.parse(await readFile(filePath, 'utf8')).todos).toHaveLength(1);
  });

  it('serializes concurrent writes without losing data', async () => {
    const repository = new FileTodoRepository(filePath);
    await Promise.all(Array.from({ length: 20 }, (_, i) => repository.insert(makeTodo(String(i)))));
    expect(await repository.list()).toHaveLength(20);
  });
});
