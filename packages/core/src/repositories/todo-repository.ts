import type { Todo } from '../todo';

/** Persistence port. Implementations must return copies, never internal references. */
export interface TodoRepository {
  list(): Promise<Todo[]>;
  findById(id: string): Promise<Todo | null>;
  insert(todo: Todo): Promise<void>;
  update(todo: Todo): Promise<void>;
  /** Returns false when no todo with this id exists. */
  delete(id: string): Promise<boolean>;
}
