import type { TodoResponse } from '@/lib/api-types';
import { readJsonBody, withErrorHandling, type IdRouteContext } from '@/lib/http';
import { getTodoService } from '@/lib/services';

export const dynamic = 'force-dynamic';

/** PATCH /api/todos/:id { completed } → 200 { todo } | 400 VALIDATION_ERROR | 404 TODO_NOT_FOUND */
export function PATCH(request: Request, { params }: IdRouteContext): Promise<Response> {
  return withErrorHandling(async () => {
    const { id } = await params;
    const body: TodoResponse = {
      todo: await getTodoService().update(id, await readJsonBody(request)),
    };
    return Response.json(body);
  });
}

/** DELETE /api/todos/:id → 204 | 404 TODO_NOT_FOUND */
export function DELETE(_request: Request, { params }: IdRouteContext): Promise<Response> {
  return withErrorHandling(async () => {
    const { id } = await params;
    await getTodoService().remove(id);
    return new Response(null, { status: 204 });
  });
}
