import 'server-only';
import { FileTodoStore, TodoService } from '@todos/core';
import { resolve } from 'node:path';

const DEFAULT_DATA_FILE = '.data/todos.json';

const globalForTodos = globalThis as typeof globalThis & { todoService?: TodoService };

/** Single TodoService per server process (survives dev hot reloads). */
export function getTodoService(): TodoService {
  if (!globalForTodos.todoService) {
    const dataFile = resolve(
      /*turbopackIgnore: true*/ process.cwd(),
      process.env.TODOS_DATA_FILE ?? DEFAULT_DATA_FILE,
    );
    globalForTodos.todoService = new TodoService({
      store: new FileTodoStore(dataFile),
    });
  }
  return globalForTodos.todoService;
}

/** Test hook: swap the service (e.g. for one backed by an in-memory store). */
export function setTodoService(service: TodoService | undefined): void {
  globalForTodos.todoService = service;
}
