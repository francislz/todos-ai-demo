import { LABELS_MAX, sortLabels } from '@todos/core/client';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LabelManager } from '@/components/LabelManager';
import { TodoApp } from '@/components/TodoApp';
import { ApiError } from '@/lib/api-client';
import { fakeApi, makeLabel, makeTodo, SAMPLE_LABELS } from './fixtures';

vi.mock('next/navigation', () => import('./mocks/next-navigation'));

const TODOS = [
  makeTodo({ id: 'a', title: 'Book flights', labelIds: ['travel', 'vacation'] }),
  makeTodo({ id: 'b', title: 'Renew passport', labelIds: ['travel', 'personal'] }),
  makeTodo({ id: 'c', title: 'Roadmap', labelIds: ['work'] }),
  makeTodo({ id: 'd', title: 'Dentist' }),
];

function renderApp(api = fakeApi(), url = '/') {
  window.history.replaceState(null, '', url);
  render(<TodoApp initialTodos={TODOS} initialLabels={SAMPLE_LABELS} api={api} />);
  return api;
}

async function openPanel() {
  await userEvent.click(screen.getByTestId('manage-labels-button'));
  return screen.getByTestId('label-manager');
}

describe('LabelManager', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('toggles the panel, focuses the new-label input and lists labels with usage', async () => {
    renderApp();
    const toggle = screen.getByTestId('manage-labels-button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const panel = await openPanel();

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Close labels');
    expect(screen.getByTestId('new-label-input')).toHaveFocus();
    expect(within(panel).getByTestId('label-count')).toHaveTextContent('4 of 50');
    expect(
      within(panel)
        .getAllByTestId('label-usage')
        .map((el) => el.textContent),
    ).toEqual(['1 todo', '2 todos', '1 todo', '1 todo']);
    // The create row preselects the least-used color (gray: no label uses it).
    expect(
      within(panel)
        .getAllByTestId('label-color-option')
        .find((el) => (el as HTMLInputElement).checked),
    ).toHaveAttribute('data-color', 'gray');

    await userEvent.click(toggle);
    expect(screen.queryByTestId('label-manager')).not.toBeInTheDocument();
  });

  it('creates a label with the chosen color and adds it to the filter bar', async () => {
    const api = renderApp();
    await openPanel();

    expect(screen.getByTestId('create-label-button')).toBeDisabled();
    await userEvent.type(screen.getByTestId('new-label-input'), 'errands');
    await userEvent.click(screen.getByRole('radio', { name: 'teal' }));
    await userEvent.click(screen.getByTestId('create-label-button'));

    expect(api.labels.create).toHaveBeenCalledWith({ name: 'errands', color: 'teal' });
    expect(await screen.findByText('Not used')).toBeInTheDocument();
    expect(screen.getByTestId('new-label-input')).toHaveValue('');
    expect(
      within(screen.getByTestId('label-filter')).getByRole('button', { name: 'errands' }),
    ).toBeInTheDocument();
  });

  it('shows a 409 inline and keeps the typed name', async () => {
    const api = fakeApi({
      labels: {
        create: vi.fn(async () => {
          throw new ApiError(409, 'LABEL_NAME_TAKEN', 'A label named "work" already exists.');
        }),
      },
    });
    renderApp(api);
    await openPanel();

    await userEvent.type(screen.getByTestId('new-label-input'), 'Work');
    await userEvent.click(screen.getByTestId('create-label-button'));

    expect(await screen.findByTestId('label-error')).toHaveTextContent(
      'A label named "work" already exists.',
    );
    expect(screen.getByTestId('label-error')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('new-label-input')).toHaveValue('Work');
    expect(screen.queryByTestId('error-banner')).not.toBeInTheDocument();
  });

  it('renames and recolors a label; chips on todos follow', async () => {
    const api = renderApp();
    await openPanel();

    await userEvent.click(screen.getByRole('button', { name: 'Edit label "travel"' }));
    const input = screen.getByTestId('label-name-input');
    expect(input).toHaveFocus();
    await userEvent.clear(input);
    await userEvent.type(input, 'trips');
    await userEvent.click(
      within(screen.getByRole('form', { name: 'Edit label "travel"' })).getByRole('radio', {
        name: 'red',
      }),
    );
    await userEvent.click(screen.getByTestId('label-save'));

    expect(api.labels.update).toHaveBeenCalledWith('travel', { name: 'trips', color: 'red' });
    expect(await screen.findByRole('button', { name: 'Edit label "trips"' })).toBeInTheDocument();
    const chips = screen
      .getAllByTestId('label-chip')
      .filter((chip) => chip.getAttribute('data-label-id') === 'travel');
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip).toHaveTextContent('trips');
      expect(chip).toHaveAttribute('data-color', 'red');
    }
  });

  it('keeps the row in edit mode when the save fails', async () => {
    const api = fakeApi({
      labels: {
        update: vi.fn(async () => {
          throw new ApiError(409, 'LABEL_NAME_TAKEN', 'A label named "work" already exists.');
        }),
      },
    });
    renderApp(api);
    await openPanel();

    await userEvent.click(screen.getByRole('button', { name: 'Edit label "travel"' }));
    await userEvent.clear(screen.getByTestId('label-name-input'));
    await userEvent.type(screen.getByTestId('label-name-input'), 'WORK');
    await userEvent.click(screen.getByTestId('label-save'));

    expect(await screen.findByTestId('label-error')).toHaveTextContent('already exists');
    expect(screen.getByTestId('label-name-input')).toHaveValue('WORK');
  });

  it.each([
    ['personal', 'It will be removed from 1 todo. The todos are kept.'],
    ['travel', 'It will be removed from 2 todos. The todos are kept.'],
  ])('confirms deleting "%s" with the affected count', async (name, consequence) => {
    renderApp();
    await openPanel();

    await userEvent.click(screen.getByRole('button', { name: `Delete label "${name}"` }));

    expect(screen.getByTestId('label-delete-message')).toHaveTextContent(
      `Delete "${name}"? ${consequence}`,
    );
    expect(screen.getByTestId('label-delete-cancel')).toHaveFocus();
  });

  it('says an unused label is not used by any todo', async () => {
    render(
      <TodoApp
        initialTodos={[]}
        initialLabels={[makeLabel({ id: 'x', name: 'idle' })]}
        api={fakeApi()}
      />,
    );
    await openPanel();
    expect(screen.getByTestId('label-usage')).toHaveTextContent('Not used');
    await userEvent.click(screen.getByTestId('label-delete'));
    expect(screen.getByTestId('label-delete-message')).toHaveTextContent(
      'Delete "idle"? It is not used by any todo.',
    );
  });

  it('deleting removes chips from todos, the label from the filter and keeps the todos', async () => {
    const api = renderApp(fakeApi(), '/?label=travel&label=work');
    await openPanel();

    await userEvent.click(screen.getByRole('button', { name: 'Delete label "travel"' }));
    await userEvent.click(screen.getByTestId('label-delete-confirm'));

    expect(api.labels.remove).toHaveBeenCalledWith('travel');
    expect(await screen.findByTestId('label-count')).toHaveTextContent('3 of 50');
    expect(
      screen.queryAllByTestId('label-chip').filter((c) => c.dataset.labelId === 'travel'),
    ).toEqual([]);
    expect(
      within(screen.getByTestId('label-filter')).queryByRole('button', { name: 'travel' }),
    ).not.toBeInTheDocument();
    expect(window.location.search).toBe('?label=work');
    expect(screen.getByTestId('filter-summary')).toHaveTextContent('Showing 1 of 4 todos');
  });

  it('shows the empty state without labels', async () => {
    render(<TodoApp initialTodos={[]} initialLabels={[]} api={fakeApi()} />);
    await openPanel();
    expect(screen.getByTestId('labels-empty-state')).toHaveTextContent(
      'No labels yet. Create your first label above.',
    );
    expect(screen.getByTestId('label-count')).toHaveTextContent('0 of 50');
  });

  it('disables the create row at the limit', () => {
    const labels = sortLabels(
      Array.from({ length: LABELS_MAX }, (_, i) => makeLabel({ id: `l${i}`, name: `label ${i}` })),
    );
    render(
      <LabelManager
        labels={labels}
        usageCounts={new Map()}
        pending={null}
        error={null}
        onClearError={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
        newLabelInputRef={createRef<HTMLInputElement>()}
      />,
    );

    expect(screen.getByTestId('new-label-input')).toBeDisabled();
    expect(screen.getByTestId('create-label-button')).toBeDisabled();
    expect(screen.getByText(/You can have at most 50 labels/)).toHaveTextContent(
      'You can have at most 50 labels. Delete one to create another.',
    );
  });
});
