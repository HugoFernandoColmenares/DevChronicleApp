import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('public smoke', () => {
  test('landing, archive, challenges, and 404 stay reachable', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Field notes for working software/i }),
    ).toBeVisible({
      timeout: 30_000,
    });

    const landingA11y = await new AxeBuilder({ page }).exclude('.filters').analyze();
    expect(landingA11y.violations.filter((item) => item.impact === 'critical')).toEqual([]);

    await page.getByRole('link', { name: 'Articles' }).click();
    await expect(page.getByRole('heading', { name: /Every article/i })).toBeVisible();

    await page.getByRole('link', { name: 'Challenges' }).click();
    await expect(page.getByRole('heading', { name: /Coding challenges/i })).toBeVisible();
    await page.getByRole('link', { name: /Suma de números pares/i }).click();
    await expect(page.getByRole('heading', { name: /Suma de números pares/i })).toBeVisible();
    await page.getByRole('button', { name: /Show hint/i }).click();
    await expect(page.locator('pre.fence')).toContainText('while (actual <= numero)');

    await page.goto('/ruta-inexistente');
    await expect(
      page.getByRole('heading', { name: /This page is not in the journal/i }),
    ).toBeVisible();
  });
});

test.describe('studio smoke', () => {
  test('emulator author can create, publish, find, and delete an entry', async ({ page }) => {
    const slug = `e2e-note-${Date.now()}`;

    await page.goto('/admin/login');
    await page.getByTestId('emulator-admin-signin').click();
    await expect(page.getByRole('heading', { name: 'Entries' })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').fill('E2E field note');
    await page.getByLabel('Slug').fill(slug);
    await page.getByLabel('Summary').fill('Created by Playwright smoke.');
    await page.getByLabel('Tags').fill('e2e, journal');
    await page.getByLabel('Markdown').fill('## Smoke\n\nPublished from Playwright.');
    await page.getByRole('button', { name: /Publish/i }).click();
    await expect(page.getByText(/Published|Draft saved/i).first()).toBeVisible({ timeout: 20_000 });

    await page.goto('/articles');
    await page.getByLabel('Search articles').fill('E2E field note');
    await expect(page.getByRole('link', { name: /E2E field note/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`/admin/edit/${slug}`);
    await page.getByRole('button', { name: /Delete/i }).click();
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByRole('heading', { name: 'Entries' })).toBeVisible({ timeout: 20_000 });
  });
});
