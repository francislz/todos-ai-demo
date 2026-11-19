import { DomainError, ERROR_CODES, ValidationError, type ErrorCode } from '@todos/core';

export const INTERNAL_ERROR_CODE = 'INTERNAL_ERROR';

const HTTP_STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.TODO_NOT_FOUND]: 404,
  [ERROR_CODES.LABEL_NOT_FOUND]: 404,
  [ERROR_CODES.LABEL_NAME_TAKEN]: 409,
  [ERROR_CODES.LABEL_LIMIT_REACHED]: 409,
};

export interface ApiErrorBody {
  error: { code: ErrorCode | typeof INTERNAL_ERROR_CODE; message: string };
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
    if (error instanceof DomainError) {
      const body: ApiErrorBody = { error: { code: error.code, message: error.message } };
      return Response.json(body, { status: HTTP_STATUS_BY_ERROR_CODE[error.code] });
    }
    console.error(error);
    const body: ApiErrorBody = {
      error: { code: INTERNAL_ERROR_CODE, message: 'Something went wrong. Please try again.' },
    };
    return Response.json(body, { status: 500 });
  }
}
