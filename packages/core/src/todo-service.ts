import { randomUUID } from 'node:crypto';
import { TodoNotFoundError } from './errors';
import type { StoreData, TodoStore } from './store/todo-store';
import type { Todo } from './todo';
import { parseCreateTodoInput, parseUpdateTodoInput } from './validation';

export interface TodoServiceDeps {
  store: TodoStore;
  now?: () => Date;
  generateId?: () => string;
}

function findTodo(data: StoreData, id: string): Todo {
  const todo = data.todos.find((candidate) => candidate.id === id);
  if (!todo) throw new TodoNotFoundError(id);
  return todo;
}

/** Application service: all TODO business rules live here, not in the HTTP layer. */
export class TodoService {
  private readonly store: TodoStore;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor({ store, now = () => new Date(), generateId = randomUUID }: TodoServiceDeps) {
    this.store = store;
    this.now = now;
    this.generateId = generateId;
  }

  /** Open todos first, then completed; newest first inside each group. */
  async list(): Promise<Todo[]> {
    const { todos } = await this.store.read();
    return todos.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  async create(input: unknown): Promise<Todo> {
    const { title } = parseCreateTodoInput(input);
    return this.store.transaction((draft) => {
      const todo: Todo = {
        id: this.generateId(),
        title,
        completed: false,
        createdAt: this.now().toISOString(),
        completedAt: null,
      };
      draft.todos.push(todo);
      return todo;
    });
  }

  async setCompleted(id: string, input: unknown): Promise<Todo> {
    const { completed } = parseUpdateTodoInput(input);
    return this.store.transaction((draft) => {
      const todo = findTodo(draft, id);
      if (todo.completed !== completed) {
        todo.completed = completed;
        todo.completedAt = completed ? this.now().toISOString() : null;
      }
      return todo;
    });
  }

  async remove(id: string): Promise<void> {
    await this.store.transaction((draft) => {
      const index = draft.todos.findIndex((todo) => todo.id === id);
      if (index === -1) throw new TodoNotFoundError(id);
      draft.todos.splice(index, 1);
    });
  }
}
