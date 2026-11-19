import { GENERIC_ERROR_MESSAGE } from './api-types';

/** The user-facing message of a failed action. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE;
}
