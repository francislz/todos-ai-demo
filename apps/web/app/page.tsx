import { Suspense } from 'react';
import { TodoApp } from '@/components/TodoApp';
import { getLabelService, getTodoService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [todos, labels] = await Promise.all([getTodoService().list(), getLabelService().list()]);

  return (
    <main className="page">
      <header className="page__header">
        <h1>Todos</h1>
        <p className="page__subtitle">
          Small app, real workflow: every change ships through Claude.
        </p>
      </header>
      {/* useSearchParams (the label filter) requires a Suspense boundary. */}
      <Suspense fallback={null}>
        <TodoApp initialTodos={todos} initialLabels={labels} />
      </Suspense>
    </main>
  );
}
