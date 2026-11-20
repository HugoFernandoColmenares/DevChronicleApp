import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4200';
const outDir = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const desktop = { width: 1440, height: 900 };
const mobile = devices['iPhone 12'];

async function shot(page, name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, name), fullPage: false });
  console.log(`Wrote ${name}`);
}

async function captureDesktop(browser) {
  const context = await browser.newContext({
    viewport: desktop,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const go = async (path) => {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  };

  await go('/');
  await page.getByRole('heading', { name: 'DevChronicle' }).waitFor({ timeout: 60_000 });
  await page
    .getByRole('link', { name: /Bienvenida|Welcome/i })
    .first()
    .waitFor({ timeout: 60_000 });
  await shot(page, 'landing-desktop.png');

  await page.getByRole('heading', { name: /Recently published/i }).scrollIntoViewIfNeeded();
  await shot(page, 'landing-series.png');

  await page.getByRole('heading', { name: /Earlier entries/i }).scrollIntoViewIfNeeded();
  await shot(page, 'landing-earlier-desktop.png');

  const more = page.getByRole('button', { name: /More tags/i });
  if ((await more.count()) > 0) {
    await more.click();
    await shot(page, 'landing-tag-filter-desktop.png');
  }

  await go('/articles');
  await page.getByRole('heading', { name: /Every article/i }).waitFor();
  await shot(page, 'articles-desktop.png');

  await page.getByLabel('Search articles').fill('nestjs');
  await page.waitForTimeout(400);
  await shot(page, 'articles-search-desktop.png');

  await page.getByLabel('Search articles').fill('zzz-no-match');
  await page.waitForTimeout(400);
  await shot(page, 'articles-empty-search-desktop.png');
  await page.getByLabel('Search articles').fill('');

  await go('/post/welcome-to-devchronicle');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'article-desktop.png');

  await go('/post/angular-signals-in-practice');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.waitForTimeout(900);
  await shot(page, 'article-code-desktop.png');

  await go('/post/construyendo-apis-por-capas-nestjs');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'post-nestjs.png');

  await go('/post/construyendo-apis-por-capas-dotnet');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'post-dotnet.png');
  await page.evaluate(() => {
    const fence = document.querySelector('pre.fence, pre');
    fence?.scrollIntoView({ block: 'center' });
  });
  await shot(page, 'post-dotnet-code.png');

  await go('/post/construyendo-apis-por-capas-spring');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'post-spring.png');
  await page.evaluate(() => {
    const fence = document.querySelector('pre.fence, pre');
    fence?.scrollIntoView({ block: 'center' });
  });
  await shot(page, 'post-spring-code.png');

  await go('/challenges');
  await page.getByRole('heading', { name: /Coding challenges/i }).waitFor();
  await shot(page, 'challenges-desktop.png');

  await go('/ruta-inexistente');
  await page.getByRole('heading', { name: /This page is not in the journal/i }).waitFor();
  await shot(page, 'not-found-desktop.png');

  await go('/post/no-existe');
  await page.waitForTimeout(800);
  await shot(page, 'article-not-found-desktop.png');

  await go('/admin/login');
  await page
    .getByRole('heading', { name: /Studio|Sign in|Author/i })
    .first()
    .waitFor();
  await shot(page, 'admin-login-desktop.png');

  await go('/admin/denied');
  await page.getByRole('heading', { name: /not an author/i }).waitFor();
  await shot(page, 'admin-denied-desktop.png');

  await go('/admin/login');
  const emulatorBtn = page.getByTestId('emulator-admin-signin');
  try {
    await emulatorBtn.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    console.warn('Emulator admin sign-in not available; skipping Studio captures.');
  }
  if ((await emulatorBtn.count()) > 0 && (await emulatorBtn.isVisible())) {
    // Auth emulator account picker (popup)
    const popupPromise = page.waitForEvent('popup', { timeout: 8_000 }).catch(() => null);
    await emulatorBtn.click();
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      await popup.waitForTimeout(600);
      await popup.screenshot({
        path: join(outDir, 'admin-auth-emulator-widget.png'),
        fullPage: false,
      });
      console.log('Wrote admin-auth-emulator-widget.png');
      const adminAccount = popup.getByText('admin@devchronicle.test');
      if ((await adminAccount.count()) > 0) {
        await adminAccount.click();
      } else {
        await popup.close().catch(() => {});
      }
    }
    await page.getByRole('heading', { name: 'Entries' }).waitFor({ timeout: 30_000 });
    await shot(page, 'admin-list-desktop.png');

    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').waitFor();
    await page.getByLabel('Title').fill('Screenshot draft');
    await page.getByLabel('Summary').fill('Capture for docs.');
    await page
      .locator('textarea[formcontrolname="markdown"]')
      .fill('## Capture\n\nTemporary note for docs screenshots.');
    await shot(page, 'admin-editor.png');
    await shot(page, 'admin-editor-new-desktop.png');

    await page.getByLabel('Title').fill('Screenshot draft (dirty)');
    await page.getByRole('link', { name: 'Entries' }).click();
    await page.getByText('Discard unsaved changes?').waitFor({ timeout: 10_000 });
    await shot(page, 'admin-unsaved-changes.png');
    await page.getByRole('button', { name: 'Cancel' }).click();
  }

  // Retry / offline UI: browser offline after a healthy load (JournalService listens to window)
  await go('/articles');
  await page.getByRole('heading', { name: /Every article/i }).waitFor();
  await context.setOffline(true);
  await page.getByRole('button', { name: /Try again/i }).waitFor({ timeout: 10_000 });
  await shot(page, 'articles-retry-desktop.png');
  await shot(page, 'articles-failure-as-empty-desktop.png');
  await context.setOffline(false);
  await go('/');
  await page.getByRole('heading', { name: 'DevChronicle' }).waitFor();
  await page
    .getByRole('link', { name: /Bienvenida|Welcome/i })
    .first()
    .waitFor({ timeout: 60_000 });
  await context.setOffline(true);
  await page.getByRole('button', { name: /Try again/i }).waitFor({ timeout: 10_000 });
  await shot(page, 'landing-retry-desktop.png');
  await context.setOffline(false);

  await context.close();
}

async function captureMobile(browser) {
  const context = await browser.newContext({
    ...mobile,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const go = async (path) => {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  };

  await go('/');
  await page.getByRole('heading', { name: 'DevChronicle' }).waitFor({ timeout: 60_000 });
  await page
    .getByRole('link', { name: /Bienvenida|Welcome/i })
    .first()
    .waitFor({ timeout: 60_000 });
  await shot(page, 'landing-mobile.png');

  await go('/articles');
  await page.getByRole('heading', { name: /Every article/i }).waitFor();
  await shot(page, 'articles-mobile.png');

  await go('/post/welcome-to-devchronicle');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'article-mobile.png');

  await go('/post/construyendo-apis-por-capas-spring');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'post-spring-mobile.png');

  await go('/ruta-inexistente');
  await page.getByRole('heading', { name: /This page is not in the journal/i }).waitFor();
  await shot(page, 'not-found-mobile.png');

  await go('/admin/login');
  await shot(page, 'admin-login-mobile.png');

  await context.close();
}

const browser = await chromium.launch();
try {
  await captureDesktop(browser);
  await captureMobile(browser);
} finally {
  await browser.close();
}

console.log('Screenshot capture complete.');
