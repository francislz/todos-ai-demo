/** A single TODO item. Dates are ISO-8601 strings so the type is JSON-safe end to end. */
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  /** Ids of existing labels, 0..TODO_LABELS_MAX, unique, in the order they were sent. */
  labelIds: string[];
}

/** Normalized create input (labelIds defaults to []). */
export interface CreateTodoInput {
  title: string;
  labelIds: string[];
}

/** A partial update: absent fields are left untouched. `labelIds` replaces the whole set. */
export interface UpdateTodoInput {
  completed?: boolean;
  labelIds?: string[];
}

export const TODO_TITLE_MAX_LENGTH = 200;

/** Maximum number of labels on one todo. */
export const TODO_LABELS_MAX = 10;

/**
 * Display order shared by server and client: open first, then completed; newest first within
 * each group. Returns a new array.
 */
export function sortTodos(todos: readonly Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
