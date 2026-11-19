import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoApp } from '@/components/TodoApp';
import { ApiError } from '@/lib/api-client';
import { fakeApi, makeTodo, SAMPLE_LABELS } from './fixtures';

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

const LISBON = makeTodo({
  id: 'lisbon',
  title: 'Book flights to Lisbon',
  labelIds: ['vacation', 'travel'],
  createdAt: '2026-01-04T00:00:00.000Z',
});
const ROADMAP = makeTodo({
  id: 'roadmap',
  title: 'Prepare Q3 roadmap review',
  labelIds: ['work'],
  createdAt: '2026-01-03T00:00:00.000Z',
});
const DENTIST = makeTodo({
  id: 'dentist',
  title: 'Call the dentist',
  createdAt: '2026-01-02T00:00:00.000Z',
});
const PASSPORT = makeTodo({
  id: 'passport',
  title: 'Renew passport',
  labelIds: ['travel', 'personal'],
  completed: true,
  completedAt: '2026-01-05T00:00:00.000Z',
});
const SAMPLE_TODOS = [LISBON, ROADMAP, DENTIST, PASSPORT];

function renderSample(api = fakeApi(), url = '/') {
  window.history.replaceState(null, '', url);
  render(<TodoApp initialTodos={SAMPLE_TODOS} initialLabels={SAMPLE_LABELS} api={api} />);
  return api;
}

function item(title: string): HTMLElement {
  const match = screen.getAllByTestId('todo-item').find((el) => el.textContent?.includes(title));
  if (!match) throw new Error(`No todo item "${title}"`);
  return match;
}

function chipNames(container: HTMLElement): string[] {
  return within(container)
    .queryAllByTestId('label-chip')
    .map((chip) => chip.textContent ?? '');
}

function visibleTitles(): string[] {
  return screen.queryAllByTestId('todo-title').map((el) => el.textContent ?? '');
}

function filterChip(name: string): HTMLElement {
  return within(screen.getByTestId('label-filter')).getByRole('button', { name });
}

describe('TodoApp with labels', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('renders the chips of each todo in label order', () => {
    renderSample();
    expect(chipNames(item('Book flights to Lisbon'))).toEqual(['travel', 'vacation-prep']);
    expect(chipNames(item('Renew passport'))).toEqual(['personal', 'travel']);
    expect(chipNames(item('Call the dentist'))).toEqual([]);
    expect(within(item('Call the dentist')).getByTestId('todo-labels-edit')).toHaveTextContent(
      '+ Label',
    );
    expect(within(item('Renew passport')).getByTestId('todo-labels-edit')).toHaveTextContent(
      'Edit labels',
    );
  });

  it('applies labels from the picker with one PATCH', async () => {
    const api = renderSample(
      fakeApi({
        todos: { update: vi.fn(async (_id, patch) => ({ ...DENTIST, ...patch })) },
      }),
    );
    const row = item('Call the dentist');

    await userEvent.click(
      within(row).getByRole('button', { name: 'Edit labels of "Call the dentist"' }),
    );
    const picker = screen.getByRole('dialog', { name: 'Edit labels of "Call the dentist"' });
    await userEvent.click(within(picker).getByRole('checkbox', { name: 'work' }));
    await userEvent.click(within(picker).getByRole('checkbox', { name: 'personal' }));
    await userEvent.click(within(picker).getByTestId('label-picker-apply'));

    expect(api.todos.update).toHaveBeenCalledTimes(1);
    expect(api.todos.update).toHaveBeenCalledWith('dentist', { labelIds: ['personal', 'work'] });
    expect(screen.queryByTestId('label-picker')).not.toBeInTheDocument();
    expect(await within(item('Call the dentist')).findAllByTestId('label-chip')).toHaveLength(2);
  });

  it('cancelling the picker sends nothing and keeps the chips', async () => {
    const api = renderSample();
    const row = item('Book flights to Lisbon');

    await userEvent.click(within(row).getByTestId('todo-labels-edit'));
    await userEvent.click(within(row).getByRole('checkbox', { name: 'travel' }));
    await userEvent.click(within(row).getByTestId('label-picker-cancel'));

    expect(api.todos.update).not.toHaveBeenCalled();
    expect(chipNames(item('Book flights to Lisbon'))).toEqual(['travel', 'vacation-prep']);
  });

  it('a failed label save shows the banner and keeps the chips', async () => {
    const api = fakeApi({
      todos: {
        update: vi.fn(async () => {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Unknown label id "work". The label may have been deleted.',
          );
        }),
      },
    });
    renderSample(api);
    const row = item('Call the dentist');

    await userEvent.click(within(row).getByTestId('todo-labels-edit'));
    await userEvent.click(within(row).getByRole('checkbox', { name: 'work' }));
    await userEvent.click(within(row).getByTestId('label-picker-apply'));

    expect(await screen.findByTestId('error-banner')).toHaveTextContent(
      'Unknown label id "work". The label may have been deleted.',
    );
    expect(chipNames(item('Call the dentist'))).toEqual([]);
  });

  it('filter chips toggle, narrow the list (OR), update counter and summary and the URL', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    renderSample();

    await userEvent.click(filterChip('travel'));
    expect(filterChip('travel')).toHaveAttribute('aria-pressed', 'true');
    expect(visibleTitles()).toEqual(['Book flights to Lisbon', 'Renew passport']);
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/?label=travel');

    await userEvent.click(filterChip('No label'));
    expect(visibleTitles()).toEqual([
      'Book flights to Lisbon',
      'Call the dentist',
      'Renew passport',
    ]);
    expect(screen.getByTestId('todo-counter')).toHaveTextContent('2 open · 1 done');
    expect(screen.getByTestId('filter-summary')).toHaveTextContent('Showing 3 of 4 todos');
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/?label=travel&label=none');

    await userEvent.click(filterChip('travel'));
    expect(filterChip('travel')).toHaveAttribute('aria-pressed', 'false');
    expect(visibleTitles()).toEqual(['Call the dentist']);
    replaceState.mockRestore();
  });

  it('reads the initial filter from the URL and clears it', async () => {
    renderSample(fakeApi(), '/?label=work&label=unknown');

    expect(filterChip('work')).toHaveAttribute('aria-pressed', 'true');
    expect(visibleTitles()).toEqual(['Prepare Q3 roadmap review']);

    await userEvent.click(
      within(screen.getByTestId('filter-summary')).getByTestId('label-filter-clear'),
    );

    expect(visibleTitles()).toHaveLength(4);
    expect(screen.queryByTestId('filter-summary')).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('shows the filtered-empty state', async () => {
    renderSample(fakeApi(), '/?label=work');
    await userEvent.click(within(item('Prepare Q3 roadmap review')).getByTestId('todo-delete'));

    expect(await screen.findByTestId('filtered-empty-state')).toHaveTextContent(
      'No todos match this filter.',
    );
    expect(screen.getByTestId('filter-summary')).toHaveTextContent('Showing 0 of 3 todos');
    await userEvent.click(
      within(screen.getByTestId('filtered-empty-state')).getByTestId('label-filter-clear'),
    );
    expect(visibleTitles()).toHaveLength(3);
  });

  it('pre-labels the add form with the filtered labels', async () => {
    const api = renderSample(fakeApi(), '/?label=travel&label=none');

    expect(chipNames(screen.getByTestId('form-labels'))).toEqual(['travel']);
    await userEvent.type(screen.getByTestId('new-todo-input'), 'Buy sunscreen');
    await userEvent.click(screen.getByTestId('add-todo-button'));

    expect(api.todos.create).toHaveBeenCalledWith({
      title: 'Buy sunscreen',
      labelIds: ['travel'],
    });
    expect(await screen.findByText('Buy sunscreen')).toBeInTheDocument();
    expect(screen.queryByTestId('filter-notice')).not.toBeInTheDocument();
  });

  it('shows the hidden-by-filter notice when the new todo does not match', async () => {
    renderSample(fakeApi(), '/?label=work');

    // Remove the pre-selected label in the form.
    await userEvent.click(screen.getByTestId('form-labels-edit'));
    await userEvent.click(screen.getByRole('checkbox', { name: 'work' }));
    await userEvent.click(screen.getByTestId('label-picker-apply'));
    expect(chipNames(screen.getByTestId('form-labels'))).toEqual([]);

    await userEvent.type(screen.getByTestId('new-todo-input'), 'Call mom');
    await userEvent.click(screen.getByTestId('add-todo-button'));

    expect(await screen.findByTestId('filter-notice')).toHaveTextContent(
      '"Call mom" was added but is hidden by the current filter.',
    );
    // The form selection is reset to the filtered labels after the add.
    expect(chipNames(screen.getByTestId('form-labels'))).toEqual(['work']);

    await userEvent.click(
      within(screen.getByTestId('filter-notice')).getByTestId('label-filter-clear'),
    );
    expect(screen.queryByTestId('filter-notice')).not.toBeInTheDocument();
    expect(screen.getByText('Call mom')).toBeInTheDocument();
  });

  it('shows "No labels yet." in the bar without labels', () => {
    render(<TodoApp initialTodos={[]} initialLabels={[]} api={fakeApi()} />);
    expect(screen.queryByTestId('label-filter')).not.toBeInTheDocument();
    expect(screen.getByText('No labels yet.')).toBeInTheDocument();
    expect(screen.getByTestId('manage-labels-button')).toHaveTextContent('Manage labels');
  });
});
