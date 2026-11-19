import type { Todo } from '../todo';
import type { TodoRepository } from './todo-repository';

export class InMemoryTodoRepository implements TodoRepository {
  private readonly todos = new Map<string, Todo>();

  constructor(seed: Todo[] = []) {
    for (const todo of seed) this.todos.set(todo.id, { ...todo });
  }

  async list(): Promise<Todo[]> {
    return [...this.todos.values()].map((todo) => ({ ...todo }));
  }

  async findById(id: string): Promise<Todo | null> {
    const todo = this.todos.get(id);
    return todo ? { ...todo } : null;
  }

  async insert(todo: Todo): Promise<void> {
    this.todos.set(todo.id, { ...todo });
  }

  async update(todo: Todo): Promise<void> {
    this.todos.set(todo.id, { ...todo });
  }

  async delete(id: string): Promise<boolean> {
    return this.todos.delete(id);
  }
}
