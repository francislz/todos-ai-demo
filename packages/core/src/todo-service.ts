import { randomUUID } from 'node:crypto';
import { TodoNotFoundError } from './errors';
import type { TodoRepository } from './repositories/todo-repository';
import type { Todo } from './todo';
import { parseCreateTodoInput, parseUpdateTodoInput } from './validation';

export interface TodoServiceDeps {
  repository: TodoRepository;
  now?: () => Date;
  generateId?: () => string;
}

/** Application service: all TODO business rules live here, not in the HTTP layer. */
export class TodoService {
  private readonly repository: TodoRepository;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor({ repository, now = () => new Date(), generateId = randomUUID }: TodoServiceDeps) {
    this.repository = repository;
    this.now = now;
    this.generateId = generateId;
  }

  /** Open todos first, then completed; newest first inside each group. */
  async list(): Promise<Todo[]> {
    const todos = await this.repository.list();
    return todos.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  async create(input: unknown): Promise<Todo> {
    const { title } = parseCreateTodoInput(input);
    const todo: Todo = {
      id: this.generateId(),
      title,
      completed: false,
      createdAt: this.now().toISOString(),
      completedAt: null,
    };
    await this.repository.insert(todo);
    return todo;
  }

  async setCompleted(id: string, input: unknown): Promise<Todo> {
    const { completed } = parseUpdateTodoInput(input);
    const existing = await this.repository.findById(id);
    if (!existing) throw new TodoNotFoundError(id);
    if (existing.completed === completed) return existing;

    const updated: Todo = {
      ...existing,
      completed,
      completedAt: completed ? this.now().toISOString() : null,
    };
    await this.repository.update(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new TodoNotFoundError(id);
  }
}
