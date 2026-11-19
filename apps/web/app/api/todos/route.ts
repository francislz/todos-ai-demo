import type { TodoResponse, TodosResponse } from '@/lib/api-types';
import { readJsonBody, withErrorHandling } from '@/lib/http';
import { getTodoService } from '@/lib/services';

export const dynamic = 'force-dynamic';

/** GET /api/todos → 200 { todos: Todo[] } */
export function GET(): Promise<Response> {
  return withErrorHandling(async () => {
    const body: TodosResponse = { todos: await getTodoService().list() };
    return Response.json(body);
  });
}

/** POST /api/todos { title, labelIds? } → 201 { todo } | 400 VALIDATION_ERROR */
export function POST(request: Request): Promise<Response> {
  return withErrorHandling(async () => {
    const body: TodoResponse = { todo: await getTodoService().create(await readJsonBody(request)) };
    return Response.json(body, { status: 201 });
  });
}
