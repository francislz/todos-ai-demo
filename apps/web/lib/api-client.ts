import type { Todo } from '@todos/core/client';
import {
  UNKNOWN_ERROR_CODE,
  type ApiErrorBody,
  type ApiErrorCode,
  type TodoResponse,
  type TodosResponse,
} from './api-types';
import { API_ENDPOINTS, resourceUrl } from './endpoints';

const REQUEST_FAILED_MESSAGE = 'Request failed. Please try again.';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | typeof UNKNOWN_ERROR_CODE,
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

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error = (body as Partial<ApiErrorBody> | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? UNKNOWN_ERROR_CODE,
      error?.message ?? REQUEST_FAILED_MESSAGE,
    );
  }
  return body as T;
}

function jsonBody(method: string, payload: unknown): RequestInit {
  return { method, body: JSON.stringify(payload) };
}

export const todosApi = {
  async list(): Promise<Todo[]> {
    return (await request<TodosResponse>(API_ENDPOINTS.todos)).todos;
  },
  async create(title: string): Promise<Todo> {
    return (await request<TodoResponse>(API_ENDPOINTS.todos, jsonBody('POST', { title }))).todo;
  },
  async setCompleted(id: string, completed: boolean): Promise<Todo> {
    const url = resourceUrl(API_ENDPOINTS.todos, id);
    return (await request<TodoResponse>(url, jsonBody('PATCH', { completed }))).todo;
  },
  async remove(id: string): Promise<void> {
    await request<void>(resourceUrl(API_ENDPOINTS.todos, id), { method: 'DELETE' });
  },
};

export type TodosApi = typeof todosApi;
