import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('public smoke', () => {
  test('el diario, el archivo, los desafíos y la 404 siguen accesibles', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'DevChronicle', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Notas de campo para')).toBeVisible();

    const landingA11y = await new AxeBuilder({ page }).analyze();
    expect(landingA11y.violations.filter((item) => item.impact === 'critical')).toEqual([]);

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Artículos' })
      .click();
    await expect(
      page.getByRole('heading', { name: /Todos los artículos, del más reciente/i }),
    ).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Desafíos' })
      .click();
    await expect(page.getByRole('heading', { name: /Desafíos de programación/i })).toBeVisible();
    await page.getByRole('link', { name: /Suma de números pares/i }).click();
    await expect(page.getByRole('heading', { name: /Suma de números pares/i })).toBeVisible();
    await page.getByRole('button', { name: /Ver pista/i }).click();
    await expect(page.locator('pre.fence')).toContainText('while (actual <= numero)');

    await page.goto('/ruta-inexistente');
    await expect(
      page.getByRole('heading', { name: /Esta página no está en el diario/i }),
    ).toBeVisible();
  });

  test('el Estudio no aparece en la navegación pública', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link', { name: 'Diario' })).toBeVisible({ timeout: 30_000 });
    await expect(nav.getByRole('link', { name: 'Estudio' })).toHaveCount(0);
  });
});

test.describe('studio smoke', () => {
  test('el autor del emulador crea, publica, encuentra y elimina una entrada', async ({ page }) => {
    const slug = `e2e-note-${Date.now()}`;
    const title = `Nota de campo ${slug}`;

    await page.goto('/admin/login');
    await page.getByTestId('emulator-admin-signin').click();
    await expect(page.getByRole('heading', { name: 'Entradas' })).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Estudio' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Nueva entrada' }).click();
    await page.getByLabel('Título').fill(title);
    await page.getByLabel('Slug').fill(slug);
    await page.getByLabel('Resumen').fill('Creada por la prueba de humo de Playwright.');
    await page.getByLabel('Etiquetas').fill('e2e, diario');
    await page.getByLabel(/^Markdown ·/).fill('## Humo\n\nPublicada desde Playwright.');
    await page.getByRole('button', { name: 'Publicar' }).click();
    // Al crear, el editor navega a /admin/edit/<slug> solo cuando Firestore confirmó el guardado.
    await expect(page).toHaveURL(new RegExp(`/admin/edit/${slug}$`), { timeout: 20_000 });
    await expect(page.getByText('Publicada', { exact: true })).toBeVisible({ timeout: 20_000 });

    await page.goto('/articles');
    await page.getByLabel('Buscar artículos').fill(title);
    await expect(page.getByRole('link', { name: title })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`/admin/edit/${slug}`);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: 'Entradas' })).toBeVisible({ timeout: 20_000 });
  });
});
