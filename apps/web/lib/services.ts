import 'server-only';
import { FileTodoStore, LabelService, TodoService, type TodoStore } from '@todos/core';
import { resolve } from 'node:path';

const DEFAULT_DATA_FILE = '.data/todos.json';

/** Both services share one store, so the store owns the only write queue on the data file. */
interface Services {
  todoService: TodoService;
  labelService: LabelService;
}

const globalForServices = globalThis as typeof globalThis & { todosAppServices?: Services };

function createServices(store: TodoStore): Services {
  return { todoService: new TodoService({ store }), labelService: new LabelService({ store }) };
}

function createFileStore(): TodoStore {
  const dataFile = resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.TODOS_DATA_FILE ?? DEFAULT_DATA_FILE,
  );
  return new FileTodoStore(dataFile);
}

/** One set of services per server process (survives dev hot reloads). */
function getServices(): Services {
  globalForServices.todosAppServices ??= createServices(createFileStore());
  return globalForServices.todosAppServices;
}

export function getTodoService(): TodoService {
  return getServices().todoService;
}

export function getLabelService(): LabelService {
  return getServices().labelService;
}

/** Test hook: rebuild both services on another store (e.g. in-memory); `undefined` resets. */
export function setTodoStore(store: TodoStore | undefined): void {
  globalForServices.todosAppServices = store ? createServices(store) : undefined;
}
