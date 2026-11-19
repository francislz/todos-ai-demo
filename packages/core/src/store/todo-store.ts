import type { Label } from '../label';
import type { Todo } from '../todo';

/** Everything the app persists, as one document. Every id in a todo's labelIds is a stored label. */
export interface StoreData {
  todos: Todo[];
  labels: Label[];
}

/**
 * Persistence port. The store knows the data shape only; business rules live in the services,
 * which run every read-then-write rule inside one transaction.
 */
export interface TodoStore {
  /** A normalized snapshot; callers may mutate it freely (it is a copy). */
  read(): Promise<StoreData>;
  /**
   * Runs `work` on a private draft, serialized with every other transaction of this store.
   * If `work` returns, the draft is persisted (file: temp file + rename); if it throws, nothing is written.
   * `work` is synchronous.
   */
  transaction<T>(work: (draft: StoreData) => T): Promise<T>;
}
