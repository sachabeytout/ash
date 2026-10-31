import { expect, test, type Page } from '@playwright/test';

const PORTRAIT = { width: 393, height: 852 };
const LANDSCAPE = { width: 852, height: 393 };

/** Le jeu tient entièrement dans l'écran, et la page n'a ni défilement ni débordement. */
async function expectGameFits(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(900); // laisse passer les recadrages différés
  const box = await page.locator('#game canvas').boundingBox();
  expect(box).not.toBeNull();
  if (!box) return box;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  const overflow = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth - window.innerWidth,
    h: document.documentElement.scrollHeight - window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  }));
  expect(overflow).toEqual({ w: 0, h: 0, scrollX: 0, scrollY: 0 });
  return box;
}

test('le jeu reste cadré quand on tourne le téléphone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-paysage', 'concerne seulement le téléphone');

  // Tenu en portrait : pas de message « tourne ton téléphone », le jeu est tourné d'office.
  await page.setViewportSize(PORTRAIT);
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'title');
  await expect(page.locator('body')).toHaveClass(/rotated/);
  const portrait = await expectGameFits(page, PORTRAIT);
  // Le jeu (paysage) occupe l'écran dans le sens de la longueur.
  expect(portrait?.height).toBeGreaterThan(portrait?.width ?? 0);

  const first = await expectGameFits(page, LANDSCAPE);
  await expect(page.locator('body')).not.toHaveClass(/rotated/);
  await expectGameFits(page, PORTRAIT);
  await expect(page.locator('body')).toHaveClass(/rotated/);
  const again = await expectGameFits(page, LANDSCAPE);

  // Après un aller-retour, le jeu retrouve exactement sa taille d'origine (pas de zoom qui s'accumule).
  expect(again).toEqual(first);
  await page.screenshot({ path: 'tests/e2e/screenshots/rotation-paysage.png' });
});
