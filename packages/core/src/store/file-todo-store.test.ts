import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileTodoStore } from './file-todo-store';
import { describeTodoStoreContract, makeStoredLabel, makeStoredTodo } from './todo-store-contract';

const contractDirs: string[] = [];

describeTodoStoreContract('FileTodoStore', () => {
  const dir = join(tmpdir(), `todos-contract-${process.pid}-${contractDirs.length}`);
  contractDirs.push(dir);
  return new FileTodoStore(join(dir, 'todos.json'));
});

afterAll(async () => {
  await Promise.all(contractDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('FileTodoStore', () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'todos-'));
    filePath = join(dir, 'nested', 'todos.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function writeRaw(content: unknown): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(content), 'utf8');
  }

  async function readRaw(): Promise<unknown> {
    return JSON.parse(await readFile(filePath, 'utf8'));
  }

  it('reads a missing file as an empty store without creating it', async () => {
    expect(await new FileTodoStore(filePath).read()).toEqual({ todos: [], labels: [] });
    await expect(readFile(filePath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('persists to disk atomically, leaving no temp file behind', async () => {
    const store = new FileTodoStore(filePath);
    await store.transaction((draft) => {
      draft.todos.push(makeStoredTodo('a'));
    });

    expect(await readRaw()).toEqual({ todos: [makeStoredTodo('a')], labels: [] });
    expect(await readdir(dirname(filePath))).toEqual(['todos.json']);
    expect((await new FileTodoStore(filePath).read()).todos).toEqual([makeStoredTodo('a')]);
  });

  it('does not touch the file when a transaction throws', async () => {
    await writeRaw({ todos: [makeStoredTodo('a')] });
    const before = await readFile(filePath, 'utf8');

    await expect(
      new FileTodoStore(filePath).transaction((draft) => {
        draft.todos = [];
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');

    expect(await readFile(filePath, 'utf8')).toBe(before);
  });

  it('treats non-array collections as empty', async () => {
    await writeRaw({ todos: 'not an array', labels: { nope: true } });
    expect(await new FileTodoStore(filePath).read()).toEqual({ todos: [], labels: [] });
  });

  it('ignores malformed entries in a hand-edited file', async () => {
    await writeRaw({
      todos: [null, 1, 'todo', makeStoredTodo('a')],
      labels: [null, 2, 'label', makeStoredLabel('l1')],
    });

    expect(await new FileTodoStore(filePath).read()).toEqual({
      todos: [makeStoredTodo('a')],
      labels: [makeStoredLabel('l1')],
    });
  });

  describe('a file written before labels existed', () => {
    const legacyTodo = {
      id: 'a',
      title: 'Legacy',
      completed: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-02T00:00:00.000Z',
    };

    it('reads as no labels and every todo unlabelled', async () => {
      await writeRaw({ todos: [legacyTodo] });

      expect(await new FileTodoStore(filePath).read()).toEqual({
        labels: [],
        todos: [{ ...legacyTodo, labelIds: [] }],
      });
    });

    it('is not rewritten by a read', async () => {
      await writeRaw({ todos: [legacyTodo] });
      const before = await readFile(filePath, 'utf8');

      await new FileTodoStore(filePath).read();

      expect(await readFile(filePath, 'utf8')).toBe(before);
    });

    it('is rewritten in the new shape by the first mutation', async () => {
      await writeRaw({ todos: [legacyTodo] });

      await new FileTodoStore(filePath).transaction((draft) => {
        draft.todos.push(makeStoredTodo('b'));
      });

      expect(await readRaw()).toEqual({
        labels: [],
        todos: [{ ...legacyTodo, labelIds: [] }, makeStoredTodo('b')],
      });
    });
  });

  it('drops label ids that match no stored label', async () => {
    await writeRaw({
      labels: [makeStoredLabel('l1')],
      todos: [makeStoredTodo('a', { labelIds: ['ghost', 'l1', 'ghost-2'] })],
    });

    expect((await new FileTodoStore(filePath).read()).todos[0]?.labelIds).toEqual(['l1']);
  });

  it('propagates JSON errors instead of silently discarding data', async () => {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, '{ not json', 'utf8');
    await expect(new FileTodoStore(filePath).read()).rejects.toBeInstanceOf(SyntaxError);
  });
});
