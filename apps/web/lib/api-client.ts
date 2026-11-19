import type {
  CreateLabelInput,
  CreateTodoInput,
  Label,
  Todo,
  UpdateLabelInput,
  UpdateTodoInput,
} from '@todos/core/client';
import {
  UNKNOWN_ERROR_CODE,
  type ApiErrorBody,
  type ApiErrorCode,
  type LabelResponse,
  type LabelsResponse,
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
  async create(input: CreateTodoInput): Promise<Todo> {
    return (await request<TodoResponse>(API_ENDPOINTS.todos, jsonBody('POST', input))).todo;
  },
  async update(id: string, patch: UpdateTodoInput): Promise<Todo> {
    const url = resourceUrl(API_ENDPOINTS.todos, id);
    return (await request<TodoResponse>(url, jsonBody('PATCH', patch))).todo;
  },
  async remove(id: string): Promise<void> {
    await request<void>(resourceUrl(API_ENDPOINTS.todos, id), { method: 'DELETE' });
  },
};

export const labelsApi = {
  async list(): Promise<Label[]> {
    return (await request<LabelsResponse>(API_ENDPOINTS.labels)).labels;
  },
  async create(input: CreateLabelInput): Promise<Label> {
    return (await request<LabelResponse>(API_ENDPOINTS.labels, jsonBody('POST', input))).label;
  },
  async update(id: string, patch: UpdateLabelInput): Promise<Label> {
    const url = resourceUrl(API_ENDPOINTS.labels, id);
    return (await request<LabelResponse>(url, jsonBody('PATCH', patch))).label;
  },
  async remove(id: string): Promise<void> {
    await request<void>(resourceUrl(API_ENDPOINTS.labels, id), { method: 'DELETE' });
  },
};

export type TodosApi = typeof todosApi;
export type LabelsApi = typeof labelsApi;

/** Everything the UI calls; injected in tests. */
export interface AppApi {
  todos: TodosApi;
  labels: LabelsApi;
}

export const appApi: AppApi = { todos: todosApi, labels: labelsApi };
