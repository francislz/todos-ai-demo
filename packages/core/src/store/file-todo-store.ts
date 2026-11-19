import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { normalizeStoreData } from './normalize';
import type { StoreData, TodoStore } from './todo-store';

/**
 * Stores everything in a single JSON file. Good enough for a local demo:
 * transactions are serialized in-process and writes are atomic (temp file + rename).
 * One instance must own the file; never create two stores for the same path.
 */
export class FileTodoStore implements TodoStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  /** Reads never write: an older file is only rewritten by the next transaction. */
  async read(): Promise<StoreData> {
    try {
      return normalizeStoreData(JSON.parse(await readFile(this.filePath, 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return normalizeStoreData({});
      throw error;
    }
  }

  transaction<T>(work: (draft: StoreData) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const draft = await this.read();
      const result = work(draft);
      await this.write(draft);
      return result;
    });
    // Keep the queue alive even if one transaction fails.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async write(data: StoreData): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    await rename(tempPath, this.filePath);
  }
}
