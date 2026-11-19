/**
 * Browser-safe HTTP API types shared by the route handlers (server) and the API client (browser).
 */
import type { ErrorCode, Todo } from '@todos/core/client';

/** Code of an unexpected server failure (HTTP 500). */
export const INTERNAL_ERROR_CODE = 'INTERNAL_ERROR';
/** Code used by the client when a failed response has no readable error body. */
export const UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export type ApiErrorCode = ErrorCode | typeof INTERNAL_ERROR_CODE;

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export interface TodosResponse {
  todos: Todo[];
}

export interface TodoResponse {
  todo: Todo;
}
