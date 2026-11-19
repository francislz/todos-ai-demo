import { normalizeStoreData } from './normalize';
import type { StoreData, TodoStore } from './todo-store';

/** In-process store for tests. Reads and commits are deep copies, so no caller shares its state. */
export class InMemoryTodoStore implements TodoStore {
  private data: StoreData;

  constructor(seed: Partial<StoreData> = {}) {
    this.data = normalizeStoreData(structuredClone(seed));
  }

  async read(): Promise<StoreData> {
    return structuredClone(this.data);
  }

  async transaction<T>(work: (draft: StoreData) => T): Promise<T> {
    const draft = structuredClone(this.data);
    const result = work(draft);
    this.data = structuredClone(draft);
    return result;
  }
}
