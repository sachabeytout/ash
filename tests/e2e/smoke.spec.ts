import { expect, test } from '@playwright/test';

test('écran titre → cage → don → combat → reprise après fermeture', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const shot = (name: string) =>
    page.screenshot({ path: `tests/e2e/screenshots/${testInfo.project.name}-${name}.png` });

  // Chemins relatifs : le jeu peut être servi sous un sous-chemin (GitHub Pages).
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'title');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForTimeout(800); // fin du fondu d'entrée
  await shot('titre');

  await page.locator('#game canvas').click();
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'hub');
  // Première visite : Aelia parle à travers les braises.
  await page.waitForTimeout(1200);
  await shot('dialogue');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await shot('cage');

  // L'arbre de Thot s'ouvre et se ferme.
  await page.keyboard.press('KeyT');
  await page.waitForTimeout(400);
  await shot('thot');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // On s'évade avec le katana : un dieu offre d'abord un don.
  await page.keyboard.press('Digit1');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'run');
  await page.waitForTimeout(1200);
  await shot('don');
  await page.keyboard.press('Digit1');
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
  await shot('combat');

  // Pause (Échap) puis reprise.
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'pause');
  await page.waitForTimeout(300);
  await shot('pause');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'run');

  // La run est sauvegardée : après un rechargement, la Cage propose de la reprendre.
  const saved = await page.evaluate(() => localStorage.getItem('ash.save'));
  expect(saved).toContain('katana');
  await page.reload();
  await page.locator('#game canvas').click();
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'hub');
  await page.waitForTimeout(800);
  await shot('reprise');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'run');

  expect(errors).toEqual([]);
});

test('le manifeste PWA est servi', async ({ request }) => {
  const res = await request.get('manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as { display: string; orientation: string };
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
});
