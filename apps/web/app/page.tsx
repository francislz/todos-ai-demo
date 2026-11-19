import { TodoApp } from '@/components/TodoApp';
import { getTodoService } from '@/lib/todo-service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const todos = await getTodoService().list();

  return (
    <main className="page">
      <header className="page__header">
        <h1>Todos</h1>
        <p className="page__subtitle">
          Small app, real workflow: every change ships through Claude.
        </p>
      </header>
      <TodoApp initialTodos={todos} />
    </main>
  );
}
