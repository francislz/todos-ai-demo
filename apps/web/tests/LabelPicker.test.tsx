import { TODO_LABELS_MAX } from '@todos/core/client';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LabelPicker } from '@/components/LabelPicker';
import { TodoApp } from '@/components/TodoApp';
import { fakeApi, makeLabel, makeTodo } from './fixtures';

vi.mock('next/navigation', () => import('./mocks/next-navigation'));

const MANY_LABELS = Array.from({ length: TODO_LABELS_MAX + 2 }, (_, i) =>
  makeLabel({ id: `l${String(i).padStart(2, '0')}`, name: `label ${String(i).padStart(2, '0')}` }),
);

function renderPicker(overrides: Partial<Parameters<typeof LabelPicker>[0]> = {}) {
  const props = {
    labels: MANY_LABELS,
    selectedIds: [],
    accessibleName: 'Edit labels of "Pack"',
    triggerTestId: 'todo-labels-edit',
    variant: 'todo' as const,
    onApply: vi.fn(),
    onManageLabels: vi.fn(),
    ...overrides,
  };
  render(<LabelPicker {...props} />);
  return props;
}

describe('LabelPicker', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('opens as a dialog, focuses the first checkbox and disables the rest at the limit', async () => {
    renderPicker();
    const trigger = screen.getByRole('button', { name: 'Edit labels of "Pack"' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveTextContent('+ Label');

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByTestId('label-picker-option');
    expect(options[0]).toHaveFocus();
    for (const option of options.slice(0, TODO_LABELS_MAX)) await userEvent.click(option);

    for (const option of options.slice(TODO_LABELS_MAX)) expect(option).toBeDisabled();
    expect(screen.getByText('Up to 10 labels per todo.')).toBeInTheDocument();

    await userEvent.click(options[0]!);
    expect(options[TODO_LABELS_MAX]).toBeEnabled();
  });

  it('Esc discards the draft and returns focus to the trigger', async () => {
    const props = renderPicker({ selectedIds: ['l01'] });
    const trigger = screen.getByTestId('todo-labels-edit');
    expect(trigger).toHaveTextContent('Edit labels');

    await userEvent.click(trigger);
    await userEvent.click(screen.getAllByTestId('label-picker-option')[0]!);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(props.onApply).not.toHaveBeenCalled();

    await userEvent.click(trigger);
    const checked = screen
      .getAllByTestId('label-picker-option')
      .filter((el) => (el as HTMLInputElement).checked);
    expect(checked.map((el) => el.dataset.labelId)).toEqual(['l01']);
  });

  it('a click outside discards the draft', async () => {
    const props = renderPicker();
    await userEvent.click(screen.getByTestId('todo-labels-edit'));
    await userEvent.click(screen.getAllByTestId('label-picker-option')[0]!);
    await userEvent.click(document.body);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it('applies the selection in label order and returns focus to the trigger', async () => {
    const props = renderPicker();
    await userEvent.click(screen.getByTestId('todo-labels-edit'));
    const options = screen.getAllByTestId('label-picker-option');
    await userEvent.click(options[3]!);
    await userEvent.click(options[1]!);
    await userEvent.click(screen.getByTestId('label-picker-apply'));

    expect(props.onApply).toHaveBeenCalledWith(['l01', 'l03']);
    expect(screen.getByTestId('todo-labels-edit')).toHaveFocus();
  });

  it('without labels, "Manage labels" closes the picker and opens the panel', async () => {
    render(
      <TodoApp initialTodos={[makeTodo({ title: 'Pack' })]} initialLabels={[]} api={fakeApi()} />,
    );
    const row = screen.getByTestId('todo-item');

    await userEvent.click(within(row).getByTestId('todo-labels-edit'));
    expect(screen.getByTestId('label-picker-empty')).toHaveTextContent('No labels yet.');
    await userEvent.click(screen.getByTestId('label-picker-manage'));

    expect(screen.queryByTestId('label-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('label-manager')).toBeInTheDocument();
    expect(screen.getByTestId('new-label-input')).toHaveFocus();
  });
});
