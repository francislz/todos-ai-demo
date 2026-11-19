// @vitest-environment node
import { InMemoryTodoStore } from '@todos/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as todoByIdRoute from '@/app/api/todos/[id]/route';
import * as todosRoute from '@/app/api/todos/route';
import { setTodoStore } from '@/lib/services';

function jsonRequest(method: string, body?: unknown, rawBody?: string): Request {
  return new Request('http://localhost/api/todos', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function createTodo(title: string) {
  const response = await todosRoute.POST(jsonRequest('POST', { title }));
  return (await response.json()).todo as { id: string; title: string; completed: boolean };
}

describe('/api/todos', () => {
  beforeEach(() => {
    setTodoStore(new InMemoryTodoStore());
  });

  afterEach(() => {
    setTodoStore(undefined);
  });

  it('creates and lists todos', async () => {
    const created = await todosRoute.POST(jsonRequest('POST', { title: 'Write tests' }));
    expect(created.status).toBe(201);

    const list = await todosRoute.GET();
    expect(list.status).toBe(200);
    expect((await list.json()).todos).toEqual([
      expect.objectContaining({ title: 'Write tests', completed: false }),
    ]);
  });

  it('returns 400 VALIDATION_ERROR for an empty title', async () => {
    const response = await todosRoute.POST(jsonRequest('POST', { title: ' ' }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR for malformed JSON', async () => {
    const response = await todosRoute.POST(jsonRequest('POST', undefined, '{oops'));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('completes a todo with PATCH', async () => {
    const todo = await createTodo('Finish demo');

    const response = await todoByIdRoute.PATCH(
      jsonRequest('PATCH', { completed: true }),
      params(todo.id),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).todo).toMatchObject({ id: todo.id, completed: true });
  });

  it('deletes a todo with DELETE and returns 404 afterwards', async () => {
    const todo = await createTodo('Remove me');

    const deleted = await todoByIdRoute.DELETE(jsonRequest('DELETE'), params(todo.id));
    expect(deleted.status).toBe(204);

    const again = await todoByIdRoute.DELETE(jsonRequest('DELETE'), params(todo.id));
    expect(again.status).toBe(404);
    expect((await again.json()).error.code).toBe('TODO_NOT_FOUND');
  });
});
