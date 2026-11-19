import { ValidationError } from './errors';
import { TODO_TITLE_MAX_LENGTH, type CreateTodoInput, type UpdateTodoInput } from './todo';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates untrusted input (e.g. a request body) and returns a normalized CreateTodoInput. */
export function parseCreateTodoInput(input: unknown): CreateTodoInput {
  if (!isRecord(input) || typeof input.title !== 'string') {
    throw new ValidationError('"title" is required and must be a string.');
  }
  const title = input.title.trim();
  if (title.length === 0) {
    throw new ValidationError('"title" must not be empty.');
  }
  if (title.length > TODO_TITLE_MAX_LENGTH) {
    throw new ValidationError(`"title" must be at most ${TODO_TITLE_MAX_LENGTH} characters.`);
  }
  return { title };
}

/** Validates untrusted input (e.g. a request body) and returns an UpdateTodoInput. */
export function parseUpdateTodoInput(input: unknown): UpdateTodoInput {
  if (!isRecord(input) || typeof input.completed !== 'boolean') {
    throw new ValidationError('"completed" is required and must be a boolean.');
  }
  return { completed: input.completed };
}
