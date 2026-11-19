import { randomUUID } from 'node:crypto';
import { TodoNotFoundError, ValidationError } from './errors';
import type { StoreData, TodoStore } from './store/todo-store';
import { sortTodos, type Todo } from './todo';
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

/** Every id must be a stored label; checked inside the transaction so it cannot race a label delete. */
function assertLabelsExist(data: StoreData, labelIds: readonly string[]): void {
  const existing = new Set(data.labels.map((label) => label.id));
  const unknownId = labelIds.find((id) => !existing.has(id));
  if (unknownId !== undefined) {
    throw new ValidationError(`Unknown label id "${unknownId}". The label may have been deleted.`);
  }
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

  /** Every todo, in display order (see sortTodos). */
  async list(): Promise<Todo[]> {
    const { todos } = await this.store.read();
    return sortTodos(todos);
  }

  async create(input: unknown): Promise<Todo> {
    const { title, labelIds } = parseCreateTodoInput(input);
    return this.store.transaction((draft) => {
      assertLabelsExist(draft, labelIds);
      const todo: Todo = {
        id: this.generateId(),
        title,
        completed: false,
        createdAt: this.now().toISOString(),
        completedAt: null,
        labelIds,
      };
      draft.todos.push(todo);
      return todo;
    });
  }

  /**
   * Partial update: absent fields are left untouched; sending the current values is a no-op.
   * `labelIds` replaces the whole set. Input is validated before the todo is looked up.
   */
  async update(id: string, input: unknown): Promise<Todo> {
    const { completed, labelIds } = parseUpdateTodoInput(input);
    return this.store.transaction((draft) => {
      const todo = findTodo(draft, id);
      if (labelIds !== undefined) {
        assertLabelsExist(draft, labelIds);
        todo.labelIds = labelIds;
      }
      if (completed !== undefined && todo.completed !== completed) {
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
