// Capturas de docs/screenshots contra los emuladores (Auth + Firestore) con datos importados de
// public/content y la cuenta falsa admin@devchronicle.test. Nunca usa credenciales reales.
//
//   npm run emulators && npm run import:emulator && npm run seed:admin && npm start
//   npm run screenshots
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4200';
const outDir = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const desktop = { width: 1440, height: 900 };
const mobile = devices['iPhone 12'];
// Peticiones a Firestore (emulador o nube) para simular una caída.
const FIRESTORE = /(127\.0\.0\.1:8080|localhost:8080|firestore\.googleapis\.com)/;

async function shot(page, name, options = {}) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outDir, name), fullPage: false, ...options });
  console.log(`Escrita ${name}`);
}

function opener(page) {
  return (path) =>
    page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
}

async function waitForJournal(page) {
  await page
    .getByRole('heading', { name: 'DevChronicle', exact: true })
    .waitFor({ timeout: 60_000 });
  await page.locator('.card__title').first().waitFor({ timeout: 60_000 });
}

async function capturePublic(browser) {
  const context = await browser.newContext({ viewport: desktop, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const go = opener(page);

  await go('/');
  await waitForJournal(page);
  await shot(page, 'landing-desktop.png');

  await page.getByRole('heading', { name: 'Publicadas recientemente' }).scrollIntoViewIfNeeded();
  await shot(page, 'landing-series.png');

  await page.getByRole('heading', { name: 'Entradas anteriores' }).scrollIntoViewIfNeeded();
  await shot(page, 'landing-earlier-desktop.png');

  await go('/');
  await waitForJournal(page);
  const more = page.getByRole('button', { name: /Más etiquetas/ });
  if ((await more.count()) > 0) {
    await more.click();
    await page.getByRole('button', { name: 'arquitectura' }).click();
    await shot(page, 'landing-tag-filter-desktop.png');
  }

  await go('/articles');
  await page.getByRole('heading', { name: /Todos los artículos/ }).waitFor();
  await page.locator('.card__title').first().waitFor({ timeout: 60_000 });
  await shot(page, 'articles-desktop.png');

  await page.getByLabel('Buscar artículos').fill('nestjs');
  await shot(page, 'articles-search-desktop.png');

  await page.getByLabel('Buscar artículos').fill('zzz-sin-coincidencias');
  await shot(page, 'articles-empty-search-desktop.png');

  const posts = [
    ['/post/welcome-to-devchronicle', 'article-desktop.png'],
    ['/post/construyendo-apis-por-capas-nestjs', 'post-nestjs.png'],
  ];
  for (const [path, name] of posts) {
    await go(path);
    await page.locator('.markdown-body').waitFor({ timeout: 60_000 });
    await shot(page, name);
  }

  for (const [path, name] of [
    ['/post/angular-signals-in-practice', 'article-code-desktop.png'],
    ['/post/construyendo-apis-por-capas-dotnet', 'post-dotnet.png'],
    ['/post/construyendo-apis-por-capas-spring', 'post-spring.png'],
  ]) {
    await go(path);
    await page.locator('.markdown-body').waitFor({ timeout: 60_000 });
    await shot(page, name);
    if (name !== 'article-code-desktop.png') {
      await page.locator('.markdown-body pre').first().scrollIntoViewIfNeeded();
      await shot(page, name.replace('.png', '-code.png'));
    } else {
      await page.locator('.markdown-body pre').first().scrollIntoViewIfNeeded();
      await page.locator('.markdown-body pre').first().hover();
      await shot(page, name);
    }
  }

  await go('/challenges');
  await page.getByRole('heading', { name: /Desafíos de programación/ }).waitFor();
  await shot(page, 'challenges-desktop.png');

  await go('/ruta-inexistente');
  await page.getByRole('heading', { name: /Esta página no está en el diario/ }).waitFor();
  await shot(page, 'not-found-desktop.png');

  await go('/post/no-existe');
  await page.getByRole('heading', { name: /Esta entrada no está publicada/ }).waitFor();
  await shot(page, 'article-not-found-desktop.png');

  await context.close();
}

async function captureOutage(browser) {
  // Caída con copia sin conexión: Firestore abortado, /offline/journal.json disponible.
  const context = await browser.newContext({ viewport: desktop, deviceScaleFactor: 1 });
  await context.route(FIRESTORE, (route) => route.abort());
  const page = await context.newPage();
  const go = opener(page);

  await go('/');
  await page.locator('.sticky-note').waitFor({ timeout: 60_000 });
  await shot(page, 'landing-offline-copy-desktop.png');

  await go('/post/angular-signals-in-practice');
  await page.locator('.sticky-note').waitFor({ timeout: 60_000 });
  await shot(page, 'article-offline-copy-desktop.png');

  // Caída sin copia: también falla la copia estática, se ve el error con reintento.
  await context.route('**/offline/journal.json', (route) => route.abort());
  await go('/articles');
  await page.getByRole('button', { name: 'Intentar de nuevo' }).waitFor({ timeout: 60_000 });
  await shot(page, 'articles-retry-desktop.png');
  await shot(page, 'articles-failure-as-empty-desktop.png');

  await go('/');
  await page.getByRole('button', { name: 'Intentar de nuevo' }).waitFor({ timeout: 60_000 });
  await shot(page, 'landing-retry-desktop.png');

  await context.close();
}

async function captureDark(browser) {
  const context = await browser.newContext({ viewport: desktop, colorScheme: 'dark' });
  const page = await context.newPage();
  const go = opener(page);
  await go('/');
  await waitForJournal(page);
  await shot(page, 'landing-dark-desktop.png');
  await go('/post/angular-signals-in-practice');
  await page.locator('.markdown-body').waitFor({ timeout: 60_000 });
  await shot(page, 'article-dark-desktop.png');
  await context.close();
}

async function captureStudio(browser) {
  const context = await browser.newContext({ viewport: desktop, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const go = opener(page);

  await go('/admin/login');
  await page.getByRole('heading', { name: /Inicia sesión para editar el diario/ }).waitFor();
  await shot(page, 'admin-login-desktop.png');

  await go('/admin/denied');
  await page.getByRole('heading', { name: /no es de un autor/ }).waitFor();
  await shot(page, 'admin-denied-desktop.png');

  // Selector de cuentas del emulador de Auth (ventana emergente de Google simulada).
  await go('/admin/login');
  const google = page.getByRole('button', { name: 'Continuar con Google' });
  await google.waitFor();
  const popupPromise = page.waitForEvent('popup', { timeout: 10_000 }).catch(() => null);
  await google.click();
  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    await popup.waitForTimeout(800);
    await popup.screenshot({ path: join(outDir, 'admin-auth-emulator-widget.png') });
    console.log('Escrita admin-auth-emulator-widget.png');
    await popup.close().catch(() => {});
  }

  await go('/admin/login');
  await page.getByTestId('emulator-admin-signin').click();
  await page.getByRole('heading', { name: 'Entradas' }).waitFor({ timeout: 30_000 });
  await shot(page, 'admin-list-desktop.png');

  await page.getByRole('link', { name: 'Nueva entrada' }).click();
  await page.getByLabel('Título').waitFor();
  await page.getByLabel('Título').fill('Borrador para las capturas');
  await page.getByLabel('Resumen').fill('Nota temporal para documentar el Estudio.');
  await page.getByLabel('Etiquetas').fill('estudio, diario');
  await page
    .getByLabel(/^Markdown ·/)
    .fill(
      '## Apunte rápido\n\nEl Estudio compila esta vista previa en el navegador.\n\n```ts\nconst nota = signal("libreta");\n```',
    );
  await shot(page, 'admin-editor.png');
  await shot(page, 'admin-editor-new-desktop.png');

  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Estudio' })
    .click();
  await page.getByText('¿Descartar los cambios sin guardar?').waitFor({ timeout: 10_000 });
  await shot(page, 'admin-unsaved-changes.png');
  await page.getByRole('button', { name: 'Cancelar' }).click();

  // Conflicto de guardado: otra pestaña guarda primero la misma entrada.
  const slug = 'markdown-as-source-of-truth';
  await go(`/admin/edit/${slug}`);
  await page.getByLabel('Resumen').waitFor();
  const other = await context.newPage();
  await other.goto(`${baseURL}/admin/edit/${slug}`, { waitUntil: 'domcontentloaded' });
  await other.getByLabel('Resumen').waitFor({ timeout: 30_000 });
  await other.waitForTimeout(800);
  await other.getByRole('button', { name: 'Publicar' }).click();
  await other.waitForTimeout(1500);
  await other.close();
  await page.getByLabel('Resumen').fill('Edición hecha en una pestaña desactualizada.');
  await page.getByRole('button', { name: 'Publicar' }).click();
  await page.getByText('La entrada cambió en otra pestaña').waitFor({ timeout: 15_000 });
  await shot(page, 'admin-conflict-desktop.png');
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await context.close();
}

async function captureMobile(browser) {
  const context = await browser.newContext({ ...mobile, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const go = opener(page);

  await go('/');
  await waitForJournal(page);
  await shot(page, 'landing-mobile.png');

  await go('/articles');
  await page.locator('.card__title').first().waitFor({ timeout: 60_000 });
  await shot(page, 'articles-mobile.png');

  for (const [path, name] of [
    ['/post/welcome-to-devchronicle', 'article-mobile.png'],
    ['/post/construyendo-apis-por-capas-spring', 'post-spring-mobile.png'],
  ]) {
    await go(path);
    await page.locator('.markdown-body').waitFor({ timeout: 60_000 });
    await shot(page, name);
  }

  await go('/ruta-inexistente');
  await page.getByRole('heading', { name: /Esta página no está en el diario/ }).waitFor();
  await shot(page, 'not-found-mobile.png');

  await go('/admin/login');
  await page.getByRole('heading', { name: /Inicia sesión/ }).waitFor();
  await shot(page, 'admin-login-mobile.png');

  await context.close();
}

const browser = await chromium.launch();
try {
  await capturePublic(browser);
  await captureOutage(browser);
  await captureDark(browser);
  await captureStudio(browser);
  await captureMobile(browser);
} finally {
  await browser.close();
}

console.log('Capturas listas.');
