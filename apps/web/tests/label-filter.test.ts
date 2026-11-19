import { sortLabels } from '@todos/core/client';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_LABEL_FILTER,
  isFilterActive,
  matchesLabelFilter,
  parseLabelFilter,
  serializeLabelFilter,
} from '@/lib/label-filter';
import { SAMPLE_LABELS } from './fixtures';

const labels = sortLabels(SAMPLE_LABELS); // personal, travel, vacation-prep, work

describe('parseLabelFilter', () => {
  it('reads the repeated key in label order', () => {
    const params = new URLSearchParams('label=work&label=personal');
    expect(parseLabelFilter(params, labels)).toEqual({
      labelIds: ['personal', 'work'],
      noLabel: false,
    });
  });

  it('reads the reserved "none" value', () => {
    const params = new URLSearchParams('label=none&label=travel');
    expect(parseLabelFilter(params, labels)).toEqual({ labelIds: ['travel'], noLabel: true });
  });

  it('ignores unknown ids and other parameters', () => {
    const params = new URLSearchParams('label=gone&q=x&label=travel');
    expect(parseLabelFilter(params, labels)).toEqual({ labelIds: ['travel'], noLabel: false });
  });

  it('returns an empty filter without the parameter', () => {
    expect(parseLabelFilter(new URLSearchParams(''), labels)).toEqual(EMPTY_LABEL_FILTER);
  });
});

describe('serializeLabelFilter', () => {
  it('writes label ids in order, then none', () => {
    const query = serializeLabelFilter(
      { labelIds: ['personal', 'work'], noLabel: true },
      new URLSearchParams(''),
    );
    expect(query).toBe('label=personal&label=work&label=none');
  });

  it('preserves other parameters and replaces the old filter', () => {
    const query = serializeLabelFilter(
      { labelIds: ['travel'], noLabel: false },
      new URLSearchParams('q=x&label=gone&label=none'),
    );
    expect(query).toBe('q=x&label=travel');
  });

  it('removes the key for an empty filter', () => {
    expect(serializeLabelFilter(EMPTY_LABEL_FILTER, new URLSearchParams('label=work'))).toBe('');
  });
});

describe('matchesLabelFilter', () => {
  const travel = { labelIds: ['travel', 'vacation'] };
  const work = { labelIds: ['work'] };
  const none = { labelIds: [] };

  it('matches everything without a filter', () => {
    expect(isFilterActive(EMPTY_LABEL_FILTER)).toBe(false);
    for (const todo of [travel, work, none]) {
      expect(matchesLabelFilter(todo, EMPTY_LABEL_FILTER)).toBe(true);
    }
  });

  it('matches any selected label (OR)', () => {
    const filter = { labelIds: ['travel', 'work'], noLabel: false };
    expect(isFilterActive(filter)).toBe(true);
    expect(matchesLabelFilter(travel, filter)).toBe(true);
    expect(matchesLabelFilter(work, filter)).toBe(true);
    expect(matchesLabelFilter(none, filter)).toBe(false);
  });

  it('matches unlabelled todos with "No label", alone or combined', () => {
    const onlyNone = { labelIds: [], noLabel: true };
    expect(matchesLabelFilter(none, onlyNone)).toBe(true);
    expect(matchesLabelFilter(work, onlyNone)).toBe(false);

    const travelOrNone = { labelIds: ['travel'], noLabel: true };
    expect(matchesLabelFilter(travel, travelOrNone)).toBe(true);
    expect(matchesLabelFilter(none, travelOrNone)).toBe(true);
    expect(matchesLabelFilter(work, travelOrNone)).toBe(false);
  });
});
