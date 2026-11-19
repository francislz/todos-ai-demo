import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import type { Label, LabelColor, Todo } from '@todos/core/client';

/**
 * Both projects share one data file per run, so every test uses names unique per project and
 * run, locates its own rows by that text and deletes what it created at the end.
 */
function uniqueSuffix(testInfo: TestInfo): string {
  return `${testInfo.project.name[0]}${Date.now().toString(36)}`;
}

class Fixtures {
  private readonly labelIds: string[] = [];
  private readonly todoIds: string[] = [];

  constructor(private readonly request: APIRequestContext) {}

  async label(name: string, color?: LabelColor): Promise<Label> {
    const response = await this.request.post('/api/labels', { data: { name, color } });
    expect(response.status()).toBe(201);
    const { label } = (await response.json()) as { label: Label };
    this.labelIds.push(label.id);
    return label;
  }

  async todo(title: string, labelIds: string[] = []): Promise<Todo> {
    const response = await this.request.post('/api/todos', { data: { title, labelIds } });
    expect(response.status()).toBe(201);
    const { todo } = (await response.json()) as { todo: Todo };
    this.todoIds.push(todo.id);
    return todo;
  }

  trackLabel(id: string) {
    this.labelIds.push(id);
  }

  trackTodo(id: string) {
    this.todoIds.push(id);
  }

  /** Deletes everything this test created (already-deleted ids answer 404, which is fine). */
  async cleanUp() {
    for (const id of this.todoIds) await this.request.delete(`/api/todos/${id}`);
    for (const id of this.labelIds) await this.request.delete(`/api/labels/${id}`);
  }
}

let fixtures: Fixtures;

test.beforeEach(({ request }) => {
  fixtures = new Fixtures(request);
});

test.afterEach(async () => {
  await fixtures.cleanUp();
});

const todoItem = (page: Page, title: string) =>
  page.getByTestId('todo-item').filter({ hasText: title });

const filterOption = (page: Page, labelId: string) =>
  page.locator(`[data-testid="label-filter-option"][data-label-id="${labelId}"]`);

const noLabelOption = (page: Page) =>
  page.locator('[data-testid="label-filter-option"][data-filter="none"]');

const chipsOf = (page: Page, title: string) => todoItem(page, title).getByTestId('label-chip');

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('Labels', () => {
  test('create a label and add a todo with it', async ({ page }, testInfo) => {
    const suffix = uniqueSuffix(testInfo);
    const name = `trip ${suffix}`;
    const title = `Pack bags ${suffix}`;
    await page.goto('/');

    await page.getByTestId('manage-labels-button').click();
    const panel = page.getByTestId('label-manager');
    await expect(page.getByTestId('new-label-input')).toBeFocused();
    await page.getByTestId('new-label-input').fill(name);
    await panel.locator('form [data-testid="label-color-option"][data-color="teal"]').check();
    await page.getByTestId('create-label-button').click();

    const row = panel.getByTestId('label-row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row.getByTestId('label-usage')).toHaveText('Not used');
    const labelId = (await row.getAttribute('data-label-id'))!;
    fixtures.trackLabel(labelId);
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: testInfo.outputPath('labels-manager.png'), fullPage: true });

    await page.getByTestId('manage-labels-button').click();
    await expect(panel).toHaveCount(0);

    await page.getByTestId('form-labels-edit').click();
    await page.getByTestId('label-picker').getByRole('checkbox', { name }).check();
    await page.getByTestId('label-picker-apply').click();
    await expect(page.getByTestId('form-labels').getByTestId('label-chip')).toHaveText(name);

    await page.getByTestId('new-todo-input').fill(title);
    await page.getByTestId('add-todo-button').click();
    const item = todoItem(page, title);
    await expect(item).toBeVisible();
    fixtures.trackTodo((await item.getByTestId('todo-toggle').getAttribute('id'))!.slice(5));
    await expect(chipsOf(page, title)).toHaveText([name]);
    await expect(chipsOf(page, title)).toHaveAttribute('data-color', 'teal');
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: testInfo.outputPath('labels-list.png'), fullPage: true });

    await page.reload();
    await expect(chipsOf(page, title)).toHaveText([name]);
  });

  test('edit the labels of an existing todo', async ({ page }, testInfo) => {
    const suffix = uniqueSuffix(testInfo);
    const first = await fixtures.label(`alpha ${suffix}`, 'blue');
    const second = await fixtures.label(`beta ${suffix}`, 'orange');
    const todo = await fixtures.todo(`Book flights ${suffix}`, [first.id]);
    await page.goto('/');

    const item = todoItem(page, todo.title);
    await item.getByRole('button', { name: `Edit labels of "${todo.title}"` }).click();
    const picker = page.getByRole('dialog', { name: `Edit labels of "${todo.title}"` });
    await expect(picker.getByRole('checkbox', { name: first.name })).toBeChecked();
    await picker.getByRole('checkbox', { name: second.name }).check();
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: testInfo.outputPath('labels-picker.png'), fullPage: true });
    await picker.getByTestId('label-picker-apply').click();

    await expect(chipsOf(page, todo.title)).toHaveText([first.name, second.name]);

    await item.getByTestId('todo-labels-edit').click();
    await picker.getByRole('checkbox', { name: first.name }).uncheck();
    await picker.getByTestId('label-picker-apply').click();
    await expect(chipsOf(page, todo.title)).toHaveText([second.name]);

    await page.reload();
    await expect(chipsOf(page, todo.title)).toHaveText([second.name]);
  });

  test('filter by labels (OR) and "No label", kept in the URL', async ({ page }, testInfo) => {
    const suffix = uniqueSuffix(testInfo);
    const a = await fixtures.label(`alpha ${suffix}`, 'green');
    const b = await fixtures.label(`beta ${suffix}`, 'purple');
    const todoA = await fixtures.todo(`Todo A ${suffix}`, [a.id]);
    const todoB = await fixtures.todo(`Todo B ${suffix}`, [b.id]);
    const todoNone = await fixtures.todo(`Todo none ${suffix}`);
    await page.goto('/');

    await filterOption(page, a.id).click();
    await expect(filterOption(page, a.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(todoItem(page, todoA.title)).toBeVisible();
    await expect(todoItem(page, todoB.title)).toHaveCount(0);
    await expect(todoItem(page, todoNone.title)).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`\\?label=${a.id}$`));

    await filterOption(page, b.id).click();
    await expect(todoItem(page, todoA.title)).toBeVisible();
    await expect(todoItem(page, todoB.title)).toBeVisible();
    await expect(todoItem(page, todoNone.title)).toHaveCount(0);
    await expect(page.getByTestId('filter-summary')).toContainText('Showing 2 of');

    await filterOption(page, a.id).click();
    await filterOption(page, b.id).click();
    await noLabelOption(page).click();
    await expect(todoItem(page, todoNone.title)).toBeVisible();
    await expect(todoItem(page, todoA.title)).toHaveCount(0);
    await expect(todoItem(page, todoB.title)).toHaveCount(0);
    await expect(page).toHaveURL(/\?label=none$/);

    await filterOption(page, a.id).click();
    await expect(page).toHaveURL(new RegExp(`\\?label=${a.id}&label=none$`));
    await expect(todoItem(page, todoA.title)).toBeVisible();
    await expect(todoItem(page, todoNone.title)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: testInfo.outputPath('labels-filter.png'), fullPage: true });

    await page.reload();
    await expect(filterOption(page, a.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(noLabelOption(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(todoItem(page, todoB.title)).toHaveCount(0);

    const shared = await page.context().newPage();
    await shared.goto(page.url());
    await expect(filterOption(shared, a.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(todoItem(shared, todoA.title)).toBeVisible();
    await expect(todoItem(shared, todoB.title)).toHaveCount(0);
    await shared.close();

    await page.getByTestId('filter-summary').getByTestId('label-filter-clear').click();
    await expect(page.getByTestId('filter-summary')).toHaveCount(0);
    await expect(todoItem(page, todoB.title)).toBeVisible();
    expect(new URL(page.url()).search).toBe('');
  });

  test('filtered-empty state', async ({ page }, testInfo) => {
    const unused = await fixtures.label(`unused ${uniqueSuffix(testInfo)}`);
    await page.goto('/');

    await filterOption(page, unused.id).click();
    await expect(page.getByTestId('filtered-empty-state')).toContainText(
      'No todos match this filter.',
    );
    await page.getByTestId('filtered-empty-state').getByTestId('label-filter-clear').click();
    await expect(page.getByTestId('filtered-empty-state')).toHaveCount(0);
  });

  test('rename and recolor a label', async ({ page }, testInfo) => {
    const suffix = uniqueSuffix(testInfo);
    const label = await fixtures.label(`old ${suffix}`, 'blue');
    const todo = await fixtures.todo(`Renamed chip ${suffix}`, [label.id]);
    const newName = `new ${suffix}`;
    const filteredPath = `/?label=${label.id}`;
    await page.goto(filteredPath);

    await page.getByTestId('manage-labels-button').click();
    await page.getByRole('button', { name: `Edit label "${label.name}"` }).click();
    await page.getByTestId('label-name-input').fill(newName);
    await page
      .getByRole('form', { name: `Edit label "${label.name}"` })
      .locator('[data-testid="label-color-option"][data-color="red"]')
      .check();
    await page.getByTestId('label-save').click();

    await expect(page.getByRole('button', { name: `Edit label "${newName}"` })).toBeVisible();
    await expect(chipsOf(page, todo.title)).toHaveText([newName]);
    await expect(chipsOf(page, todo.title)).toHaveAttribute('data-color', 'red');
    await expect(filterOption(page, label.id)).toHaveText(new RegExp(newName));
    await expect(filterOption(page, label.id)).toHaveAttribute('data-color', 'red');

    // A filtered URL from before the rename still works (ids never change).
    await page.goto(filteredPath);
    await expect(filterOption(page, label.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(todoItem(page, todo.title)).toBeVisible();
  });

  test('creating a duplicate name in another casing shows the 409 message', async ({
    page,
  }, testInfo) => {
    const existing = await fixtures.label(`Dup ${uniqueSuffix(testInfo)}`);
    await page.goto('/');

    await page.getByTestId('manage-labels-button').click();
    await page.getByTestId('new-label-input').fill(existing.name.toUpperCase());
    await page.getByTestId('create-label-button').click();

    await expect(page.getByTestId('label-error')).toHaveText(
      `A label named "${existing.name}" already exists.`,
    );
  });

  test('delete a label: confirmation, cascade and URL', async ({ page }, testInfo) => {
    const suffix = uniqueSuffix(testInfo);
    const label = await fixtures.label(`gone ${suffix}`, 'yellow');
    const keep = await fixtures.label(`keep ${suffix}`, 'gray');
    const first = await fixtures.todo(`Keep me 1 ${suffix}`, [label.id, keep.id]);
    const second = await fixtures.todo(`Keep me 2 ${suffix}`, [label.id]);
    await page.goto(`/?label=${label.id}&label=${keep.id}`);

    await page.getByTestId('manage-labels-button').click();
    await page.getByRole('button', { name: `Delete label "${label.name}"` }).click();
    await expect(page.getByTestId('label-delete-message')).toHaveText(
      `Delete "${label.name}"? It will be removed from 2 todos. The todos are kept.`,
    );
    await expect(page.getByTestId('label-delete-cancel')).toBeFocused();
    await page.getByTestId('label-delete-confirm').click();

    await expect(filterOption(page, label.id)).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`\\?label=${keep.id}$`));
    await expect(chipsOf(page, first.title)).toHaveText([keep.name]);

    await page.getByTestId('filter-summary').getByTestId('label-filter-clear').click();
    await expect(todoItem(page, second.title)).toBeVisible();
    await expect(chipsOf(page, second.title)).toHaveCount(0);

    await page.reload();
    await expect(page.locator(`[data-label-id="${label.id}"]`)).toHaveCount(0);
    await expect(todoItem(page, first.title)).toBeVisible();
    await expect(todoItem(page, second.title)).toBeVisible();
  });
});
