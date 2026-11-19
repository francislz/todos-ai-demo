import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Todo } from '../todo';
import type { TodoRepository } from './todo-repository';

interface StoreFile {
  todos: Todo[];
}

/**
 * Stores todos in a single JSON file. Good enough for a local demo:
 * writes are serialized in-process and done atomically (temp file + rename).
 */
export class FileTodoRepository implements TodoRepository {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async list(): Promise<Todo[]> {
    return (await this.read()).todos;
  }

  async findById(id: string): Promise<Todo | null> {
    return (await this.read()).todos.find((todo) => todo.id === id) ?? null;
  }

  insert(todo: Todo): Promise<void> {
    return this.mutate((store) => {
      store.todos.push(todo);
    });
  }

  update(todo: Todo): Promise<void> {
    return this.mutate((store) => {
      store.todos = store.todos.map((existing) => (existing.id === todo.id ? todo : existing));
    });
  }

  delete(id: string): Promise<boolean> {
    return this.mutate((store) => {
      const before = store.todos.length;
      store.todos = store.todos.filter((todo) => todo.id !== id);
      return store.todos.length !== before;
    });
  }

  private mutate<T>(change: (store: StoreFile) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const store = await this.read();
      const result = change(store);
      await this.write(store);
      return result;
    });
    // Keep the queue alive even if one mutation fails.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async read(): Promise<StoreFile> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<StoreFile>;
      return { todos: Array.isArray(parsed.todos) ? parsed.todos : [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { todos: [] };
      throw error;
    }
  }

  private async write(store: StoreFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, JSON.stringify(store, null, 2), 'utf8');
    await rename(tempPath, this.filePath);
  }
}
