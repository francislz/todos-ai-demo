// @vitest-environment node
import { InMemoryTodoStore, LABELS_MAX, type Label, type Todo } from '@todos/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as labelByIdRoute from '@/app/api/labels/[id]/route';
import * as labelsRoute from '@/app/api/labels/route';
import * as todoByIdRoute from '@/app/api/todos/[id]/route';
import * as todosRoute from '@/app/api/todos/route';
import { setTodoStore } from '@/lib/services';

function jsonRequest(method: string, body?: unknown, rawBody?: string): Request {
  return new Request('http://localhost/api', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function expectError(response: Response, status: number, code: string, message?: string) {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body.error.code).toBe(code);
  if (message !== undefined) expect(body.error.message).toBe(message);
}

async function createTodo(title: string, labelIds?: string[]): Promise<Todo> {
  const response = await todosRoute.POST(jsonRequest('POST', { title, labelIds }));
  return (await response.json()).todo;
}

async function createLabel(name: string, color?: string): Promise<Label> {
  const response = await labelsRoute.POST(jsonRequest('POST', { name, color }));
  expect(response.status).toBe(201);
  return (await response.json()).label;
}

async function listTodos(): Promise<Todo[]> {
  return (await (await todosRoute.GET()).json()).todos;
}

beforeEach(() => {
  setTodoStore(new InMemoryTodoStore());
});

afterEach(() => {
  setTodoStore(undefined);
});

describe('/api/todos', () => {
  it('creates and lists todos, each with labelIds', async () => {
    const created = await todosRoute.POST(jsonRequest('POST', { title: 'Write tests' }));
    expect(created.status).toBe(201);
    expect((await created.json()).todo).toMatchObject({ title: 'Write tests', labelIds: [] });

    const list = await todosRoute.GET();
    expect(list.status).toBe(200);
    expect((await list.json()).todos).toEqual([
      expect.objectContaining({ title: 'Write tests', completed: false, labelIds: [] }),
    ]);
  });

  it('creates a todo with labels, de-duplicated in the order sent', async () => {
    const work = await createLabel('work');
    const home = await createLabel('home');

    const todo = await createTodo('Labelled', [work.id, home.id, work.id]);

    expect(todo.labelIds).toEqual([work.id, home.id]);
  });

  it('returns 400 VALIDATION_ERROR for an empty title', async () => {
    const response = await todosRoute.POST(jsonRequest('POST', { title: ' ' }));
    await expectError(response, 400, 'VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR for malformed JSON', async () => {
    const response = await todosRoute.POST(jsonRequest('POST', undefined, '{oops'));
    await expectError(response, 400, 'VALIDATION_ERROR');
  });

  it.each([
    ['not an array', 'work', '"labelIds" must be an array of strings.'],
    ['an array with a number', [1], '"labelIds" must be an array of strings.'],
    [
      'more than 10 labels',
      Array.from({ length: 11 }, (_, i) => `id-${i}`),
      '"labelIds" must contain at most 10 labels.',
    ],
    ['an unknown id', ['nope'], 'Unknown label id "nope". The label may have been deleted.'],
  ])('POST rejects labelIds that are %s', async (_case, labelIds, message) => {
    const response = await todosRoute.POST(jsonRequest('POST', { title: 'x', labelIds }));
    await expectError(response, 400, 'VALIDATION_ERROR', message);
    expect(await listTodos()).toEqual([]);
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

  it('PATCH with only labelIds replaces the labels and keeps the completion state', async () => {
    const work = await createLabel('work');
    const home = await createLabel('home');
    const todo = await createTodo('Relabel', [work.id]);
    await todoByIdRoute.PATCH(jsonRequest('PATCH', { completed: true }), params(todo.id));

    const response = await todoByIdRoute.PATCH(
      jsonRequest('PATCH', { labelIds: [home.id] }),
      params(todo.id),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).todo).toMatchObject({
      completed: true,
      completedAt: expect.any(String),
      labelIds: [home.id],
    });
  });

  it('PATCH with an empty labelIds clears the labels', async () => {
    const work = await createLabel('work');
    const todo = await createTodo('Clear me', [work.id]);

    const response = await todoByIdRoute.PATCH(
      jsonRequest('PATCH', { labelIds: [] }),
      params(todo.id),
    );

    expect((await response.json()).todo.labelIds).toEqual([]);
  });

  it.each([
    ['an empty body', {}, 'Provide at least one of "completed" or "labelIds".'],
    ['a non-object body', [true], 'Provide at least one of "completed" or "labelIds".'],
    ['a non-boolean completed', { completed: 'yes' }, '"completed" must be a boolean.'],
    ['a non-array labelIds', { labelIds: 'x' }, '"labelIds" must be an array of strings.'],
    [
      'an unknown label id',
      { labelIds: ['nope'] },
      'Unknown label id "nope". The label may have been deleted.',
    ],
  ])('PATCH returns 400 VALIDATION_ERROR for %s', async (_case, body, message) => {
    const todo = await createTodo('Typed');
    const response = await todoByIdRoute.PATCH(jsonRequest('PATCH', body), params(todo.id));
    await expectError(response, 400, 'VALIDATION_ERROR', message);
  });

  it('PATCH validates the body before checking that the todo exists', async () => {
    const response = await todoByIdRoute.PATCH(jsonRequest('PATCH', {}), params('missing'));
    await expectError(response, 400, 'VALIDATION_ERROR');
  });

  it('PATCH returns 404 TODO_NOT_FOUND for an unknown todo', async () => {
    const response = await todoByIdRoute.PATCH(
      jsonRequest('PATCH', { completed: true }),
      params('missing'),
    );
    await expectError(response, 404, 'TODO_NOT_FOUND', 'Todo "missing" was not found.');
  });

  it('deletes a todo with DELETE and returns 404 afterwards', async () => {
    const todo = await createTodo('Remove me');

    const deleted = await todoByIdRoute.DELETE(jsonRequest('DELETE'), params(todo.id));
    expect(deleted.status).toBe(204);

    const again = await todoByIdRoute.DELETE(jsonRequest('DELETE'), params(todo.id));
    await expectError(again, 404, 'TODO_NOT_FOUND');
  });
});

describe('/api/labels', () => {
  it('lists labels sorted by name, case-insensitively', async () => {
    await createLabel('work');
    await createLabel('Personal');
    await createLabel('travel');

    const response = await labelsRoute.GET();

    expect(response.status).toBe(200);
    const { labels } = await response.json();
    expect(labels.map((label: Label) => label.name)).toEqual(['Personal', 'travel', 'work']);
  });

  it('creates a label with a normalized name and an explicit color', async () => {
    const response = await labelsRoute.POST(
      jsonRequest('POST', { name: '  Vacation   prep ', color: 'orange' }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).label).toEqual({
      id: expect.any(String),
      name: 'Vacation prep',
      color: 'orange',
      createdAt: expect.any(String),
    });
  });

  it('picks the least-used palette color when color is omitted', async () => {
    expect((await createLabel('first')).color).toBe('gray');
    expect((await createLabel('second')).color).toBe('red');
  });

  it.each([
    ['a missing name', {}, '"name" is required and must be a string.'],
    ['a non-string name', { name: 42 }, '"name" is required and must be a string.'],
    ['an empty name', { name: '   ' }, '"name" must not be empty.'],
    ['a too long name', { name: 'x'.repeat(31) }, '"name" must be at most 30 characters.'],
    [
      'a name with bad characters',
      { name: '#urgent' },
      `"name" must start with a letter or digit and may only contain letters, digits, spaces and - _ & ' . /`,
    ],
    [
      'a color outside the palette',
      { name: 'ok', color: 'pink' },
      '"color" must be one of: gray, red, orange, yellow, green, teal, blue, purple.',
    ],
  ])('POST returns 400 VALIDATION_ERROR for %s', async (_case, body, message) => {
    const response = await labelsRoute.POST(jsonRequest('POST', body));
    await expectError(response, 400, 'VALIDATION_ERROR', message);
  });

  it('POST returns 400 VALIDATION_ERROR for malformed JSON', async () => {
    const response = await labelsRoute.POST(jsonRequest('POST', undefined, '{oops'));
    await expectError(response, 400, 'VALIDATION_ERROR');
  });

  it('POST returns 409 LABEL_NAME_TAKEN for the same name in another casing', async () => {
    await createLabel('Vacation prep');

    const response = await labelsRoute.POST(jsonRequest('POST', { name: 'VACATION PREP' }));

    await expectError(
      response,
      409,
      'LABEL_NAME_TAKEN',
      'A label named "Vacation prep" already exists.',
    );
  });

  it('POST returns 409 LABEL_LIMIT_REACHED at 50 labels, even for a taken name', async () => {
    for (let i = 0; i < LABELS_MAX; i++) await createLabel(`label ${i}`);

    for (const name of ['one more', 'label 0']) {
      const response = await labelsRoute.POST(jsonRequest('POST', { name }));
      await expectError(
        response,
        409,
        'LABEL_LIMIT_REACHED',
        'You can have at most 50 labels. Delete one to create another.',
      );
    }
  });

  it('PATCH renames (own-name casing allowed) and recolors, keeping the id', async () => {
    const label = await createLabel('work', 'purple');

    const renamed = await labelByIdRoute.PATCH(
      jsonRequest('PATCH', { name: 'Work' }),
      params(label.id),
    );
    expect(renamed.status).toBe(200);
    expect((await renamed.json()).label).toMatchObject({ id: label.id, name: 'Work' });

    const recolored = await labelByIdRoute.PATCH(
      jsonRequest('PATCH', { color: 'teal' }),
      params(label.id),
    );
    expect((await recolored.json()).label).toMatchObject({
      id: label.id,
      name: 'Work',
      color: 'teal',
    });
  });

  it.each([
    ['an empty body', {}, 'Provide at least one of "name" or "color".'],
    ['a non-object body', 'x', 'Provide at least one of "name" or "color".'],
    ['an empty name', { name: '' }, '"name" must not be empty.'],
    [
      'a bad color',
      { color: 'pink' },
      '"color" must be one of: gray, red, orange, yellow, green, teal, blue, purple.',
    ],
  ])('PATCH returns 400 VALIDATION_ERROR for %s', async (_case, body, message) => {
    const label = await createLabel('work');
    const response = await labelByIdRoute.PATCH(jsonRequest('PATCH', body), params(label.id));
    await expectError(response, 400, 'VALIDATION_ERROR', message);
  });

  it('PATCH returns 400 VALIDATION_ERROR for malformed JSON', async () => {
    const label = await createLabel('work');
    const response = await labelByIdRoute.PATCH(
      jsonRequest('PATCH', undefined, '{oops'),
      params(label.id),
    );
    await expectError(response, 400, 'VALIDATION_ERROR');
  });

  it('PATCH returns 404 LABEL_NOT_FOUND for an unknown label', async () => {
    const response = await labelByIdRoute.PATCH(
      jsonRequest('PATCH', { color: 'red' }),
      params('missing'),
    );
    await expectError(response, 404, 'LABEL_NOT_FOUND', 'Label "missing" was not found.');
  });

  it("PATCH returns 409 LABEL_NAME_TAKEN when renaming to another label's name", async () => {
    await createLabel('work');
    const home = await createLabel('home');

    const response = await labelByIdRoute.PATCH(
      jsonRequest('PATCH', { name: 'WORK' }),
      params(home.id),
    );

    await expectError(response, 409, 'LABEL_NAME_TAKEN', 'A label named "work" already exists.');
  });

  it('DELETE returns 204, then 404 LABEL_NOT_FOUND for the same id', async () => {
    const label = await createLabel('work');

    const deleted = await labelByIdRoute.DELETE(jsonRequest('DELETE'), params(label.id));
    expect(deleted.status).toBe(204);

    const again = await labelByIdRoute.DELETE(jsonRequest('DELETE'), params(label.id));
    await expectError(again, 404, 'LABEL_NOT_FOUND');
  });

  it('DELETE removes the label from every todo and keeps the todos', async () => {
    const travel = await createLabel('travel');
    const work = await createLabel('work');
    await createTodo('Book flights', [travel.id, work.id]);
    await createTodo('Pack', [travel.id]);
    await createTodo('Unrelated');

    await labelByIdRoute.DELETE(jsonRequest('DELETE'), params(travel.id));

    const todos = await listTodos();
    expect(todos).toHaveLength(3);
    expect(todos.flatMap((todo) => todo.labelIds)).toEqual([work.id]);
    const { labels } = await (await labelsRoute.GET()).json();
    expect(labels.map((label: Label) => label.id)).toEqual([work.id]);
  });
});
