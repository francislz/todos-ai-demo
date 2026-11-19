import { readJsonBody, withErrorHandling } from '@/lib/http';
import { getTodoService } from '@/lib/todo-service';

export const dynamic = 'force-dynamic';

/** GET /api/todos → 200 { todos: Todo[] } */
export function GET(): Promise<Response> {
  return withErrorHandling(async () => {
    const todos = await getTodoService().list();
    return Response.json({ todos });
  });
}

/** POST /api/todos { title } → 201 { todo } | 400 VALIDATION_ERROR */
export function POST(request: Request): Promise<Response> {
  return withErrorHandling(async () => {
    const todo = await getTodoService().create(await readJsonBody(request));
    return Response.json({ todo }, { status: 201 });
  });
}
