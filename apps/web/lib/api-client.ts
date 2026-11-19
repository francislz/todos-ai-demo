import type { Todo } from '@todos/core/client';

const TODOS_ENDPOINT = '/api/todos';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as
    (T & { error?: { code: string; message: string } }) | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'UNKNOWN_ERROR',
      body?.error?.message ?? 'Request failed. Please try again.',
    );
  }
  return body as T;
}

export const todosApi = {
  async list(): Promise<Todo[]> {
    return (await request<{ todos: Todo[] }>(TODOS_ENDPOINT)).todos;
  },
  async create(title: string): Promise<Todo> {
    const body = JSON.stringify({ title });
    return (await request<{ todo: Todo }>(TODOS_ENDPOINT, { method: 'POST', body })).todo;
  },
  async setCompleted(id: string, completed: boolean): Promise<Todo> {
    const body = JSON.stringify({ completed });
    const url = `${TODOS_ENDPOINT}/${encodeURIComponent(id)}`;
    return (await request<{ todo: Todo }>(url, { method: 'PATCH', body })).todo;
  },
  async remove(id: string): Promise<void> {
    await request<void>(`${TODOS_ENDPOINT}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

export type TodosApi = typeof todosApi;
