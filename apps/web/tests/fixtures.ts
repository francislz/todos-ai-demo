import type { Label, Todo } from '@todos/core/client';
import { vi } from 'vitest';
import type { AppApi, LabelsApi, TodosApi } from '@/lib/api-client';

export function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    title: 'Existing todo',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    labelIds: [],
    ...overrides,
  };
}

export function makeLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: 'label-1',
    name: 'work',
    color: 'purple',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Sample labels of the design mockups, deliberately unsorted. */
export const SAMPLE_LABELS: Label[] = [
  makeLabel({ id: 'work', name: 'work', color: 'purple' }),
  makeLabel({ id: 'personal', name: 'personal', color: 'green' }),
  makeLabel({ id: 'vacation', name: 'vacation-prep', color: 'orange' }),
  makeLabel({ id: 'travel', name: 'travel', color: 'blue' }),
];

export function fakeTodosApi(overrides: Partial<TodosApi> = {}): TodosApi {
  return {
    list: vi.fn(async () => []),
    create: vi.fn(async ({ title, labelIds }) =>
      makeTodo({ id: 'new', title, labelIds, createdAt: '2026-02-01T00:00:00.000Z' }),
    ),
    update: vi.fn(async (id, patch) =>
      makeTodo({
        id,
        ...(patch.completed !== undefined && {
          completed: patch.completed,
          completedAt: patch.completed ? '2026-02-01T00:00:00.000Z' : null,
        }),
        ...(patch.labelIds !== undefined && { labelIds: patch.labelIds }),
      }),
    ),
    remove: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function fakeLabelsApi(overrides: Partial<LabelsApi> = {}): LabelsApi {
  return {
    list: vi.fn(async () => []),
    create: vi.fn(async ({ name, color }) =>
      makeLabel({ id: `id-${name}`, name, color: color ?? 'gray' }),
    ),
    update: vi.fn(async (id, patch) => makeLabel({ id, ...patch })),
    remove: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function fakeApi(
  overrides: { todos?: Partial<TodosApi>; labels?: Partial<LabelsApi> } = {},
): AppApi {
  return { todos: fakeTodosApi(overrides.todos), labels: fakeLabelsApi(overrides.labels) };
}
