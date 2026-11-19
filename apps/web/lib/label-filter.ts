import type { Label, Todo } from '@todos/core/client';

/** Query parameter of the label filter: `?label=<id>&label=<id>&label=none`. */
export const LABEL_FILTER_PARAM = 'label';
/** Reserved value of LABEL_FILTER_PARAM that selects todos without labels. */
export const NO_LABEL_FILTER_VALUE = 'none';

export interface LabelFilter {
  /** Selected label ids, in label order. */
  labelIds: string[];
  /** Whether "No label" is selected. */
  noLabel: boolean;
}

export const EMPTY_LABEL_FILTER: LabelFilter = { labelIds: [], noLabel: false };

/** The read side of URLSearchParams (also satisfied by Next's ReadonlyURLSearchParams). */
export type SearchParamsReader = Pick<URLSearchParams, 'getAll' | 'toString'>;

/**
 * Reads the filter from query parameters. Values that are neither a known label id nor
 * NO_LABEL_FILTER_VALUE are ignored. `labels` must be sorted; the result follows its order.
 */
export function parseLabelFilter(
  params: SearchParamsReader,
  labels: readonly Label[],
): LabelFilter {
  const values = new Set(params.getAll(LABEL_FILTER_PARAM));
  return {
    labelIds: labels.filter((label) => values.has(label.id)).map((label) => label.id),
    noLabel: values.has(NO_LABEL_FILTER_VALUE),
  };
}

/**
 * Writes the filter into a copy of `params` (other parameters are preserved) and returns the
 * query string without "?". Label ids are written in the given order, then NO_LABEL_FILTER_VALUE.
 */
export function serializeLabelFilter(filter: LabelFilter, params: SearchParamsReader): string {
  const next = new URLSearchParams(params.toString());
  next.delete(LABEL_FILTER_PARAM);
  for (const id of filter.labelIds) next.append(LABEL_FILTER_PARAM, id);
  if (filter.noLabel) next.append(LABEL_FILTER_PARAM, NO_LABEL_FILTER_VALUE);
  return next.toString();
}

export function isFilterActive(filter: LabelFilter): boolean {
  return filter.noLabel || filter.labelIds.length > 0;
}

/** OR semantics: any selected label, or no label at all when "No label" is selected. */
export function matchesLabelFilter(todo: Pick<Todo, 'labelIds'>, filter: LabelFilter): boolean {
  if (!isFilterActive(filter)) return true;
  if (filter.noLabel && todo.labelIds.length === 0) return true;
  return todo.labelIds.some((id) => filter.labelIds.includes(id));
}
