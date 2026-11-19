export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Base class for expected, user-facing domain errors. The web layer maps `code` to an HTTP status. */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(ERROR_CODES.VALIDATION_ERROR, message);
    this.name = 'ValidationError';
  }
}

export class TodoNotFoundError extends DomainError {
  constructor(id: string) {
    super(ERROR_CODES.TODO_NOT_FOUND, `Todo "${id}" was not found.`);
    this.name = 'TodoNotFoundError';
  }
}
