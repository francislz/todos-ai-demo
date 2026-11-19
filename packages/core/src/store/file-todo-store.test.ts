import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileTodoStore } from './file-todo-store';
import { describeTodoStoreContract, makeStoredTodo } from './todo-store-contract';

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
    expect(await new FileTodoStore(filePath).read()).toEqual({ todos: [] });
    await expect(readFile(filePath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('persists to disk atomically, leaving no temp file behind', async () => {
    const store = new FileTodoStore(filePath);
    await store.transaction((draft) => {
      draft.todos.push(makeStoredTodo('a'));
    });

    expect(await readRaw()).toEqual({ todos: [makeStoredTodo('a')] });
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

  it('treats a file without a todos array as empty', async () => {
    await writeRaw({ todos: 'not an array' });
    expect(await new FileTodoStore(filePath).read()).toEqual({ todos: [] });
  });

  it('propagates JSON errors instead of silently discarding data', async () => {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, '{ not json', 'utf8');
    await expect(new FileTodoStore(filePath).read()).rejects.toBeInstanceOf(SyntaxError);
  });
});
