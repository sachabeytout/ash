import { expect, test } from '@playwright/test';

test('le jeu démarre, puis on entre dans la cage', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'title');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForTimeout(800); // fin du fondu d'entrée
  await page.screenshot({ path: `tests/e2e/screenshots/${testInfo.project.name}-titre.png` });

  await page.locator('#game canvas').click();
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'hub');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `tests/e2e/screenshots/${testInfo.project.name}-cage.png` });

  expect(errors).toEqual([]);
});

test('le manifeste PWA est servi', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as { display: string; orientation: string };
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
});
