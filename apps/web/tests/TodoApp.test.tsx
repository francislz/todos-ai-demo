import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoApp } from '@/components/TodoApp';
import { ApiError } from '@/lib/api-client';
import { fakeApi, makeTodo } from './fixtures';

vi.mock('next/navigation', () => import('./mocks/next-navigation'));

describe('TodoApp', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('shows the empty state when there are no todos', () => {
    render(<TodoApp initialTodos={[]} initialLabels={[]} api={fakeApi()} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('todo-counter')).toHaveTextContent('0 open · 0 done');
  });

  it('creates a todo and clears the input', async () => {
    const api = fakeApi();
    render(<TodoApp initialTodos={[]} initialLabels={[]} api={api} />);

    const input = screen.getByTestId('new-todo-input');
    await userEvent.type(input, 'Prepare the demo');
    await userEvent.click(screen.getByTestId('add-todo-button'));

    expect(api.todos.create).toHaveBeenCalledWith({ title: 'Prepare the demo', labelIds: [] });
    expect(await screen.findByText('Prepare the demo')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('disables "Add" while the title is blank', async () => {
    render(<TodoApp initialTodos={[]} initialLabels={[]} api={fakeApi()} />);
    expect(screen.getByTestId('add-todo-button')).toBeDisabled();
    await userEvent.type(screen.getByTestId('new-todo-input'), '   ');
    expect(screen.getByTestId('add-todo-button')).toBeDisabled();
  });

  it('completes a todo and updates the counter', async () => {
    const api = fakeApi();
    render(<TodoApp initialTodos={[makeTodo()]} initialLabels={[]} api={api} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Complete "Existing todo"' }));

    expect(api.todos.update).toHaveBeenCalledWith('todo-1', { completed: true });
    expect(await screen.findByTestId('todo-counter')).toHaveTextContent('0 open · 1 done');
    expect(screen.getByTestId('todo-item')).toHaveAttribute('data-completed', 'true');
  });

  it('deletes a todo', async () => {
    const api = fakeApi();
    render(<TodoApp initialTodos={[makeTodo()]} initialLabels={[]} api={api} />);

    const item = screen.getByTestId('todo-item');
    await userEvent.click(within(item).getByRole('button', { name: 'Delete "Existing todo"' }));

    expect(api.todos.remove).toHaveBeenCalledWith('todo-1');
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows the API error message when an action fails', async () => {
    const api = fakeApi({
      todos: {
        create: vi.fn(async () => {
          throw new ApiError(400, 'VALIDATION_ERROR', '"title" must not be empty.');
        }),
      },
    });
    render(<TodoApp initialTodos={[]} initialLabels={[]} api={api} />);

    await userEvent.type(screen.getByTestId('new-todo-input'), 'x');
    await userEvent.click(screen.getByTestId('add-todo-button'));

    expect(await screen.findByRole('alert')).toHaveTextContent('"title" must not be empty.');
    expect(screen.getByTestId('new-todo-input')).toHaveValue('x');
  });
});
