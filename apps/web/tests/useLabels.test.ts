import { ERROR_CODES } from '@todos/core/client';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLabels } from '@/hooks/useLabels';
import { ApiError } from '@/lib/api-client';
import { INTERNAL_ERROR_CODE } from '@/lib/api-types';
import { fakeLabelsApi, SAMPLE_LABELS } from './fixtures';

const NOT_FOUND = new ApiError(404, ERROR_CODES.LABEL_NOT_FOUND, 'Label "travel" was not found.');

function labelIds(result: { current: ReturnType<typeof useLabels> }): string[] {
  return result.current.labels.map((label) => label.id);
}

describe('useLabels', () => {
  it('treats a delete of an already-deleted label as done, without an error', async () => {
    const api = fakeLabelsApi({
      remove: vi.fn(async () => {
        throw NOT_FOUND;
      }),
    });
    const { result } = renderHook(() => useLabels(api, SAMPLE_LABELS));

    let removed: boolean | undefined;
    await act(async () => {
      removed = await result.current.remove('travel');
    });

    expect(removed).toBe(true);
    expect(labelIds(result)).not.toContain('travel');
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBeNull();
  });

  it('keeps the label and reports other delete failures', async () => {
    const api = fakeLabelsApi({
      remove: vi.fn(async () => {
        throw new ApiError(500, INTERNAL_ERROR_CODE, 'Something went wrong.');
      }),
    });
    const { result } = renderHook(() => useLabels(api, SAMPLE_LABELS));

    let removed: boolean | undefined;
    await act(async () => {
      removed = await result.current.remove('travel');
    });

    expect(removed).toBe(false);
    expect(labelIds(result)).toContain('travel');
    expect(result.current.error).toBe('Something went wrong.');
  });

  it('forgets a label that is gone on update and shows the error', async () => {
    const api = fakeLabelsApi({
      update: vi.fn(async () => {
        throw NOT_FOUND;
      }),
    });
    const { result } = renderHook(() => useLabels(api, SAMPLE_LABELS));

    let updated: unknown;
    await act(async () => {
      updated = await result.current.update('travel', { name: 'trips' });
    });

    expect(updated).toBeNull();
    expect(labelIds(result)).not.toContain('travel');
    expect(labelIds(result)).toHaveLength(SAMPLE_LABELS.length - 1);
    expect(result.current.error).toBe('Label "travel" was not found.');
  });
});
