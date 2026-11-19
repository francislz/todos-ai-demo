/** A single TODO item. Dates are ISO-8601 strings so the type is JSON-safe end to end. */
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateTodoInput {
  title: string;
}

export interface UpdateTodoInput {
  completed: boolean;
}

export const TODO_TITLE_MAX_LENGTH = 200;

/** Display order shared by server and client: open first, then completed; newest first within each group. Returns a new array. */
export function sortTodos(todos: readonly Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
