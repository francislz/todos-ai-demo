import { ERROR_CODES, ValidationError, type ErrorCode } from '@todos/core';
import { GENERIC_ERROR_MESSAGE, INTERNAL_ERROR_CODE, type ApiErrorBody } from './api-types';

const HTTP_STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.TODO_NOT_FOUND]: 404,
  [ERROR_CODES.LABEL_NOT_FOUND]: 404,
  [ERROR_CODES.LABEL_NAME_TAKEN]: 409,
  [ERROR_CODES.LABEL_LIMIT_REACHED]: 409,
};

/** Second argument of a route handler under a `[id]` segment. */
export interface IdRouteContext {
  params: Promise<{ id: string }>;
}

interface DomainErrorLike {
  code: ErrorCode;
  message: string;
}

/**
 * Recognizes a domain error by its code, not with `instanceof DomainError`: the services live on
 * globalThis and are often created by another bundle layer (the page render), whose copy of
 * @todos/core has its own error classes.
 */
function asDomainError(error: unknown): DomainErrorLike | null {
  if (!(error instanceof Error) || !('code' in error)) return null;
  const { code } = error;
  if (typeof code !== 'string' || !Object.hasOwn(HTTP_STATUS_BY_ERROR_CODE, code)) return null;
  return { code: code as ErrorCode, message: error.message };
}

/** Parses a JSON request body; malformed JSON becomes a VALIDATION_ERROR. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON.');
  }
}

/** Runs a route handler and maps domain errors to a consistent JSON error response. */
export async function withErrorHandling(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    const domainError = asDomainError(error);
    if (domainError) {
      const { code, message } = domainError;
      const body: ApiErrorBody = { error: { code, message } };
      return Response.json(body, { status: HTTP_STATUS_BY_ERROR_CODE[code] });
    }
    console.error(error);
    const body: ApiErrorBody = {
      error: { code: INTERNAL_ERROR_CODE, message: GENERIC_ERROR_MESSAGE },
    };
    return Response.json(body, { status: 500 });
  }
}
