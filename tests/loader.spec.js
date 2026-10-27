import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

function expectVisibleWordmark(buffer) {
  const { data, width, height } = PNG.sync.read(buffer);
  let count = 0, left = width, right = 0, top = height, bottom = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i] > 244 && data[i + 1] > 110 && data[i + 1] < 180 && data[i + 2] < 65) {
      count++; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  expect(count / (width * height)).toBeGreaterThan(0.012);
  expect(left).toBeGreaterThan(width * 0.06);
  expect(right).toBeLessThan(width * 0.94);
  expect(top).toBeGreaterThan(height * 0.14);
  expect(bottom).toBeLessThan(height * 0.88);
}

for (const [device, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  test(`${device}: real WebGL assembles and releases the homepage`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('.page-loader')).toHaveAttribute('data-mode', 'webgl');
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.page-loader')?.dataset.phase === 'assembled', null, { timeout: 9000 });
    expectVisibleWordmark(await page.screenshot({ path: `test-results/${device}-assembled.png` }));
    await expect(page.locator('.page-loader')).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('button', { name: /Replay/ })).toBeEnabled();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/${device}-revealed.png` });
  });
}

test('reduced motion skips WebGL and releases immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sceneRequests = [];
  page.on('request', request => { if (request.url().includes('LoaderScene')) sceneRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('.page-loader')).toHaveCount(0);
  expect(sceneRequests).toEqual([]);
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
});

test('WebGL unavailable uses accessible static fallback', async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto('/');
  await expect(page.locator('.page-loader')).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('missing font fails open', async ({ page }) => {
  await page.route('**/fonts/*.json', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.page-loader')).toHaveCount(0, { timeout: 10000 });
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
});

test('timeout releases a stalled lazy scene', async ({ page }) => {
  await page.route('**/loader/LoaderScene.jsx', async route => {
    await new Promise(resolve => setTimeout(resolve, 12000));
    await route.abort();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.page-loader')).toHaveCount(0, { timeout: 11000 });
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
});

test('assembled wordmark stays stable until homepage assets resolve, including resize', async ({ page }) => {
  await page.goto('/tests/fixtures/loader.html');
  await page.waitForFunction(() => document.querySelector('.page-loader')?.dataset.phase === 'assembled', null, { timeout: 9000 });
  await page.waitForTimeout(800);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.waitForTimeout(200);
  await expect(page.locator('.page-loader')).toHaveAttribute('data-phase', 'assembled');
  expectVisibleWordmark(await page.screenshot({ path: 'test-results/resize-assembled.png' }));
  await page.getByRole('button').evaluate(button => button.click());
  await expect(page.locator('output')).toHaveText('released');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('readiness gate also has a hard timeout in reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/fixtures/loader.html?timeout=1200');
  await expect(page.locator('.page-loader')).toBeVisible();
  await expect(page.locator('.page-loader').getByRole('status')).toContainText('Preparing Apex');
  await expect(page.locator('output')).toHaveText('released', { timeout: 3000 });
});

test('history navigation does not replay; explicit preview replay does', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.page-loader')).toHaveCount(0, { timeout: 11000 });
  await page.evaluate(() => { history.pushState({}, '', '/#preview'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('.page-loader')).toHaveCount(0);
  await page.getByRole('button', { name: /Replay/ }).click();
  await expect(page.locator('.page-loader')).toBeVisible();
  await expect(page.locator('.page-loader')).toHaveAttribute('data-phase', 'assembled', { timeout: 9000 });
  await expect(page.locator('.page-loader')).toHaveCount(0);
});
