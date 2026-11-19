'use client';

import type { Label, Todo } from '@todos/core/client';
import { useMemo, useRef, useState } from 'react';
import { useFormLabelSelection } from '@/hooks/useFormLabelSelection';
import { useLabelFilter } from '@/hooks/useLabelFilter';
import { useLabels } from '@/hooks/useLabels';
import { useTodos } from '@/hooks/useTodos';
import { appApi, type AppApi } from '@/lib/api-client';
import { isFilterActive, matchesLabelFilter } from '@/lib/label-filter';
import { FilterNotice, FilterSummary } from './FilterStatus';
import { LabelFilterBar } from './LabelFilterBar';
import { LabelManager } from './LabelManager';
import { TodoForm } from './TodoForm';
import { TodoList } from './TodoList';

interface TodoAppProps {
  initialTodos: Todo[];
  initialLabels: Label[];
  /** Injected in tests; defaults to the real HTTP client. */
  api?: AppApi;
}

function countUsage(todos: readonly Todo[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const todo of todos) {
    for (const id of todo.labelIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Composition only: state and actions live in hooks, markup in presentational components. */
export function TodoApp({ initialTodos, initialLabels, api = appApi }: TodoAppProps) {
  const todos = useTodos(api.todos, initialTodos);
  const labels = useLabels(api.labels, initialLabels);
  const labelFilter = useLabelFilter(labels.labels);
  const { filter } = labelFilter;
  const formLabels = useFormLabelSelection(filter.labelIds, labels.labels);

  const [managerOpen, setManagerOpen] = useState(false);
  const [hiddenTitle, setHiddenTitle] = useState<string | null>(null);
  const newLabelInputRef = useRef<HTMLInputElement>(null);

  const filtered = isFilterActive(filter);
  const visibleTodos = useMemo(
    () => todos.todos.filter((todo) => matchesLabelFilter(todo, filter)),
    [todos.todos, filter],
  );
  const openCount = visibleTodos.filter((todo) => !todo.completed).length;
  const doneCount = visibleTodos.length - openCount;
  const usageCounts = useMemo(() => countUsage(todos.todos), [todos.todos]);

  /** Wraps a user action: the hidden-by-filter notice lasts only until the next action. */
  function action<A extends unknown[], R>(handler: (...args: A) => R): (...args: A) => R {
    return (...args) => {
      setHiddenTitle(null);
      return handler(...args);
    };
  }

  const clearFilter = action(labelFilter.clear);

  const createTodo = action(async (title: string) => {
    const todo = await todos.create({ title, labelIds: formLabels.labelIds });
    if (!todo) return false;
    formLabels.reset();
    if (!matchesLabelFilter(todo, filter)) setHiddenTitle(todo.title);
    return true;
  });

  const removeLabel = action(async (id: string) => {
    const removed = await labels.remove(id);
    if (removed) {
      todos.removeLabelFromAll(id);
      labelFilter.drop(id);
    }
    return removed;
  });

  /** A panel error belongs to the panel session: it does not survive closing and reopening. */
  const toggleManager = action(() => {
    labels.clearError();
    setManagerOpen((open) => !open);
  });

  /** From a picker's empty state: open the panel, or focus its input when already open. */
  function openManager() {
    setHiddenTitle(null);
    if (managerOpen) {
      newLabelInputRef.current?.focus();
      return;
    }
    labels.clearError();
    setManagerOpen(true);
  }

  return (
    <section className="card" aria-labelledby="todos-heading">
      <header className="card__header">
        <h2 id="todos-heading">My todos</h2>
        <p className="counter" data-testid="todo-counter">
          {openCount} open · {doneCount} done
        </p>
      </header>

      <TodoForm
        labels={labels.labels}
        selectedLabelIds={formLabels.labelIds}
        onSelectedLabelIdsChange={action(formLabels.setLabelIds)}
        onCreate={createTodo}
        onManageLabels={openManager}
      />

      {todos.error && (
        <p className="error-banner" role="alert" data-testid="error-banner">
          {todos.error}
        </p>
      )}

      <LabelFilterBar
        labels={labels.labels}
        filter={filter}
        onToggleLabel={action(labelFilter.toggle)}
        onToggleNoLabel={action(labelFilter.toggleNoLabel)}
        managerOpen={managerOpen}
        onToggleManager={toggleManager}
      />

      {managerOpen && (
        <LabelManager
          labels={labels.labels}
          usageCounts={usageCounts}
          pending={labels.pending}
          error={labels.error}
          onClearError={labels.clearError}
          onCreate={action(labels.create)}
          onUpdate={action(labels.update)}
          onRemove={removeLabel}
          newLabelInputRef={newLabelInputRef}
        />
      )}

      {filtered && (
        <FilterSummary
          visible={visibleTodos.length}
          total={todos.todos.length}
          onClear={clearFilter}
        />
      )}

      {hiddenTitle !== null && <FilterNotice title={hiddenTitle} onClear={clearFilter} />}

      <TodoList
        todos={visibleTodos}
        labels={labels.labels}
        busyIds={todos.busyIds}
        filtered={filtered}
        onClearFilter={clearFilter}
        onToggle={action(todos.toggle)}
        onDelete={action(todos.remove)}
        onSetLabels={action(todos.setLabels)}
        onManageLabels={openManager}
      />
    </section>
  );
}
