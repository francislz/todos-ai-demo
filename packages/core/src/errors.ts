import { LABELS_MAX } from './label';

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  LABEL_NOT_FOUND: 'LABEL_NOT_FOUND',
  LABEL_NAME_TAKEN: 'LABEL_NAME_TAKEN',
  LABEL_LIMIT_REACHED: 'LABEL_LIMIT_REACHED',
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

export class LabelNotFoundError extends DomainError {
  constructor(id: string) {
    super(ERROR_CODES.LABEL_NOT_FOUND, `Label "${id}" was not found.`);
    this.name = 'LabelNotFoundError';
  }
}

export class LabelNameTakenError extends DomainError {
  /** @param existingName the display name of the label that already uses the name */
  constructor(existingName: string) {
    super(ERROR_CODES.LABEL_NAME_TAKEN, `A label named "${existingName}" already exists.`);
    this.name = 'LabelNameTakenError';
  }
}

export class LabelLimitReachedError extends DomainError {
  constructor() {
    super(
      ERROR_CODES.LABEL_LIMIT_REACHED,
      `You can have at most ${LABELS_MAX} labels. Delete one to create another.`,
    );
    this.name = 'LabelLimitReachedError';
  }
}
