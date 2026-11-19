import { readJsonBody, withErrorHandling } from '@/lib/http';
import { getTodoService } from '@/lib/todo-service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** PATCH /api/todos/:id { completed?, labelIds? } → 200 { todo } | 400 VALIDATION_ERROR | 404 TODO_NOT_FOUND */
export function PATCH(request: Request, { params }: RouteParams): Promise<Response> {
  return withErrorHandling(async () => {
    const { id } = await params;
    const todo = await getTodoService().update(id, await readJsonBody(request));
    return Response.json({ todo });
  });
}

/** DELETE /api/todos/:id → 204 | 404 TODO_NOT_FOUND */
export function DELETE(_request: Request, { params }: RouteParams): Promise<Response> {
  return withErrorHandling(async () => {
    const { id } = await params;
    await getTodoService().remove(id);
    return new Response(null, { status: 204 });
  });
}
