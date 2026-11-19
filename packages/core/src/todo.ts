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
