// @vitest-environment node
import { LabelNameTakenError } from '@todos/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withErrorHandling } from '@/lib/http';

/** Same shape as a core domain error, but from another copy of the module (another bundle layer). */
class ForeignDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const fail = (error: unknown) => withErrorHandling(async () => Promise.reject(error));

describe('withErrorHandling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps a core domain error to its status and body', async () => {
    const response = await fail(new LabelNameTakenError('work'));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: 'LABEL_NAME_TAKEN', message: 'A label named "work" already exists.' },
    });
  });

  it('maps a domain error from another bundle layer by its code', async () => {
    const response = await fail(
      new ForeignDomainError('TODO_NOT_FOUND', 'Todo "x" was not found.'),
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('TODO_NOT_FOUND');
  });

  it.each([
    ['a plain error', new Error('boom')],
    ['an error with an unknown code', new ForeignDomainError('EACCES', 'denied')],
    ['a thrown string', 'boom'],
  ])('answers 500 INTERNAL_ERROR for %s without leaking the message', async (_case, error) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await fail(error);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
  });
});
