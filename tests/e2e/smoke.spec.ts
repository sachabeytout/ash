import { expect, test } from '@playwright/test';

test('le jeu démarre, puis on entre dans la cage', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // Chemins relatifs : le jeu peut être servi sous un sous-chemin (GitHub Pages).
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'title');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForTimeout(800); // fin du fondu d'entrée
  await page.screenshot({ path: `tests/e2e/screenshots/${testInfo.project.name}-titre.png` });

  await page.locator('#game canvas').click();
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'hub');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `tests/e2e/screenshots/${testInfo.project.name}-cage.png` });

  // On s'évade avec le katana, on se déplace et on frappe.
  await page.keyboard.press('Digit1');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'run');
  await page.waitForTimeout(1500); // les premiers ennemis apparaissent
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyW');
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('KeyJ');
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Space');
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `tests/e2e/screenshots/${testInfo.project.name}-combat.png` });

  expect(errors).toEqual([]);
});

test('le manifeste PWA est servi', async ({ request }) => {
  const res = await request.get('manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as { display: string; orientation: string };
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
});
