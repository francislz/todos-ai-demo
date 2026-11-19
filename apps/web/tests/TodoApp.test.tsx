import type { Todo } from '@todos/core/client';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TodoApp } from '@/components/TodoApp';
import { ApiError, type TodosApi } from '@/lib/api-client';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    title: 'Existing todo',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

function fakeApi(overrides: Partial<TodosApi> = {}): TodosApi {
  return {
    list: vi.fn(async () => []),
    create: vi.fn(async (title: string) =>
      makeTodo({ id: 'new', title, createdAt: '2026-02-01T00:00:00.000Z' }),
    ),
    setCompleted: vi.fn(async (id: string, completed: boolean) =>
      makeTodo({ id, completed, completedAt: completed ? '2026-02-01T00:00:00.000Z' : null }),
    ),
    remove: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('TodoApp', () => {
  it('shows the empty state when there are no todos', () => {
    render(<TodoApp initialTodos={[]} api={fakeApi()} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('todo-counter')).toHaveTextContent('0 open · 0 done');
  });

  it('creates a todo and clears the input', async () => {
    const api = fakeApi();
    render(<TodoApp initialTodos={[]} api={api} />);

    const input = screen.getByTestId('new-todo-input');
    await userEvent.type(input, 'Prepare the demo');
    await userEvent.click(screen.getByTestId('add-todo-button'));

    expect(api.create).toHaveBeenCalledWith('Prepare the demo');
    expect(await screen.findByText('Prepare the demo')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('disables "Add" while the title is blank', async () => {
    render(<TodoApp initialTodos={[]} api={fakeApi()} />);
    expect(screen.getByTestId('add-todo-button')).toBeDisabled();
    await userEvent.type(screen.getByTestId('new-todo-input'), '   ');
    expect(screen.getByTestId('add-todo-button')).toBeDisabled();
  });

  it('completes a todo and updates the counter', async () => {
    const api = fakeApi();
    render(<TodoApp initialTodos={[makeTodo()]} api={api} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Complete "Existing todo"' }));

    expect(api.setCompleted).toHaveBeenCalledWith('todo-1', true);
    expect(await screen.findByTestId('todo-counter')).toHaveTextContent('0 open · 1 done');
    expect(screen.getByTestId('todo-item')).toHaveAttribute('data-completed', 'true');
  });

  it('deletes a todo', async () => {
    const api = fakeApi();
    render(<TodoApp initialTodos={[makeTodo()]} api={api} />);

    const item = screen.getByTestId('todo-item');
    await userEvent.click(within(item).getByRole('button', { name: 'Delete "Existing todo"' }));

    expect(api.remove).toHaveBeenCalledWith('todo-1');
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows the API error message when an action fails', async () => {
    const api = fakeApi({
      create: vi.fn(async () => {
        throw new ApiError(400, 'VALIDATION_ERROR', '"title" must not be empty.');
      }),
    });
    render(<TodoApp initialTodos={[]} api={api} />);

    await userEvent.type(screen.getByTestId('new-todo-input'), 'x');
    await userEvent.click(screen.getByTestId('add-todo-button'));

    expect(await screen.findByRole('alert')).toHaveTextContent('"title" must not be empty.');
    expect(screen.getByTestId('new-todo-input')).toHaveValue('x');
  });
});
