import { expect, test } from '@playwright/test';

test.describe('Todos', () => {
  test('create, complete, reload and delete a todo', async ({ page }, testInfo) => {
    const title = `E2E ${testInfo.project.name} ${Date.now()}`;
    await page.goto('/');

    await page.getByTestId('new-todo-input').fill(title);
    await page.getByTestId('add-todo-button').click();

    const item = page.getByTestId('todo-item').filter({ hasText: title });
    await expect(item).toBeVisible();
    await expect(page.getByTestId('new-todo-input')).toHaveValue('');

    await item.getByRole('checkbox').click();
    await expect(item).toHaveAttribute('data-completed', 'true');

    // Persisted on the server, not only in client state.
    await page.reload();
    await expect(item).toHaveAttribute('data-completed', 'true');
    await page.screenshot({ path: testInfo.outputPath('todos.png'), fullPage: true });

    await item.getByRole('button', { name: `Delete "${title}"` }).click();
    await expect(item).toHaveCount(0);
  });

  test('cannot add a blank todo', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('new-todo-input').fill('   ');
    await expect(page.getByTestId('add-todo-button')).toBeDisabled();
  });
});
