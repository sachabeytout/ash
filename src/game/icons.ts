import Phaser from 'phaser';
import type { GodDef } from '../data/gods';

type Pt = readonly [number, number];

/** Tête de faucon de profil, bec crochu vers la droite (Râ, Khonsou). */
// prettier-ignore
const FALCON: readonly Pt[] = [
  [-0.5, 1], [-0.6, 0.35], [-0.5, 0], [-0.3, -0.18], [0, -0.24], [0.3, -0.18], [0.55, -0.02],
  [0.78, 0.2], [0.8, 0.42], [0.7, 0.56], [0.66, 0.38], [0.52, 0.3], [0.3, 0.36], [0.22, 0.6],
  [0.15, 1],
];
/** Tête de crocodile de profil, long museau vers la droite (Sobek). */
const CROCODILE: readonly Pt[] = [
  [-0.95, 0],
  [-0.7, -0.2],
  [-0.45, -0.4],
  [-0.25, -0.38],
  [-0.1, -0.18],
  [0.4, -0.12],
  [0.88, -0.08],
  [0.98, 0.05],
  [0.9, 0.18],
  [0.3, 0.22],
  [-0.3, 0.35],
  [-0.95, 0.4],
];
/** Animal de Seth : museau long et courbé, oreilles dressées au bout carré. */
const SETH_ANIMAL: readonly Pt[] = [
  [-0.5, 1],
  [-0.55, 0.3],
  [-0.4, -0.05],
  [-0.42, -0.72],
  [-0.54, -0.92],
  [-0.22, -0.92],
  [-0.28, -0.72],
  [-0.25, -0.1],
  [-0.15, -0.12],
  [-0.12, -0.7],
  [-0.22, -0.88],
  [0.1, -0.88],
  [0.02, -0.7],
  [0, -0.1],
  [0.35, 0],
  [0.65, 0.15],
  [0.8, 0.35],
  [0.72, 0.45],
  [0.55, 0.32],
  [0.25, 0.35],
  [0.1, 0.55],
  [0.05, 1],
];
/** Tête de chacal de profil : deux grandes oreilles pointues, museau fin (Anubis). */
const JACKAL: readonly Pt[] = [
  [-0.45, 1],
  [-0.5, 0.3],
  [-0.45, -0.1],
  [-0.52, -0.95],
  [-0.2, -0.3],
  [-0.12, -0.95],
  [0.08, -0.22],
  [0.45, -0.05],
  [0.92, 0.12],
  [0.92, 0.25],
  [0.4, 0.32],
  [0.15, 0.5],
  [0.05, 1],
];
/** Tête de déesse de profil, perruque égyptienne (Serket, Isis) ; la coiffe se pose au-dessus. */
const GODDESS: readonly Pt[] = [
  [-0.55, 0.95],
  [-0.62, 0.2],
  [-0.5, -0.15],
  [-0.2, -0.3],
  [0.15, -0.28],
  [0.3, -0.12],
  [0.33, 0],
  [0.48, 0.2],
  [0.35, 0.26],
  [0.38, 0.36],
  [0.28, 0.48],
  [0.14, 0.58],
  [0.12, 0.95],
];

/**
 * Icône d'un dieu : sa représentation égyptienne (tête de faucon, de crocodile, de chacal…) avec un
 * détail de son pouvoir (flammes, eau, givre, éclair, venin, fêlure, griffes, ânkh, flèches).
 * La forme suffit à reconnaître chaque dieu, sans la couleur.
 */
export function drawGodIcon(
  g: Phaser.GameObjects.Graphics,
  god: GodDef,
  x: number,
  y: number,
  size: number,
  color = god.color,
): void {
  const dark = 0x07060d;
  const thin = Math.max(1, size / 7);
  const v = (px: number, py: number) => new Phaser.Math.Vector2(x + px * size, y + py * size);
  const fill = (pts: readonly Pt[], c = color) =>
    g.fillStyle(c, 1).fillPoints(
      pts.map(([px, py]) => v(px, py)),
      true,
    );
  const line = (pts: readonly Pt[], c = color, w = thin) =>
    g.lineStyle(w, c, 1).strokePoints(
      pts.map(([px, py]) => v(px, py)),
      false,
    );
  const dot = (px: number, py: number, r: number, c = color) =>
    g.fillStyle(c, 1).fillCircle(x + px * size, y + py * size, r * size);
  const eye = (px: number, py: number) =>
    g.fillStyle(dark, 1).fillEllipse(x + px * size, y + py * size, size * 0.2, size * 0.13);

  switch (god.icon) {
    case 'falconSun': {
      // Râ : tête de faucon coiffée du disque solaire, d'où jaillissent des flammes.
      for (const a of [-150, -90, -30]) {
        const r = (a * Math.PI) / 180;
        const side = 0.22;
        fill([
          [Math.cos(r - side) * 0.3, -0.6 + Math.sin(r - side) * 0.3],
          [Math.cos(r) * 0.68, -0.6 + Math.sin(r) * 0.68],
          [Math.cos(r + side) * 0.3, -0.6 + Math.sin(r + side) * 0.3],
        ]);
      }
      dot(0, -0.6, 0.33);
      fill(FALCON);
      eye(0.26, 0.08);
      line(
        [
          [0.22, 0.14],
          [0.12, 0.5],
        ],
        dark,
      );
      break;
    }
    case 'falconMoon': {
      // Khonsou : faucon coiffé du croissant et du disque de lune ; givre (cristal, glaçons).
      dot(-0.05, -0.55, 0.38);
      dot(-0.05, -0.72, 0.32, dark);
      dot(-0.05, -0.64, 0.17);
      fill(FALCON);
      eye(0.26, 0.08);
      line(
        [
          [0.22, 0.14],
          [0.12, 0.5],
        ],
        dark,
      );
      fill([
        [0.6, 0.48],
        [0.7, 0.5],
        [0.66, 0.74],
      ]);
      fill([
        [0.26, 0.46],
        [0.36, 0.46],
        [0.31, 0.7],
      ]);
      // Cristal de givre (six branches fines).
      for (const a of [0, 60, 120]) {
        const r = (a * Math.PI) / 180;
        const dx = Math.cos(r) * 0.26;
        const dy = Math.sin(r) * 0.26;
        // prettier-ignore
        line([[0.72 - dx, -0.7 - dy], [0.72 + dx, -0.7 + dy]], color, Math.max(1, size / 12));
      }
      break;
    }
    case 'crocodile': {
      // Sobek : tête de crocodile au-dessus de l'eau.
      fill(CROCODILE);
      eye(-0.32, -0.22);
      line(
        [
          [-0.25, 0.12],
          [0.88, 0.06],
        ],
        dark,
      );
      dot(0.86, -0.12, 0.08);
      line([
        [-0.9, 0.72],
        [-0.6, 0.56],
        [-0.3, 0.72],
        [0, 0.56],
        [0.3, 0.72],
        [0.6, 0.56],
        [0.9, 0.72],
      ]);
      break;
    }
    case 'sethAnimal': {
      // Seth : l'animal de Seth, et un éclair.
      fill(SETH_ANIMAL);
      eye(-0.08, 0.12);
      fill([
        [0.62, -0.95],
        [0.4, -0.5],
        [0.58, -0.5],
        [0.45, -0.1],
        [0.88, -0.62],
        [0.68, -0.62],
        [0.84, -0.95],
      ]);
      break;
    }
    case 'scorpionCrown': {
      // Serket : déesse coiffée d'un scorpion, une goutte de venin au bout du dard.
      fill(GODDESS);
      eye(0.18, 0.08);
      line(
        [
          [0.05, -0.27],
          [0, 0.2],
          [-0.05, 0.95],
        ],
        dark,
      );
      g.fillStyle(color, 1).fillEllipse(x - size * 0.05, y - size * 0.48, size * 0.7, size * 0.26);
      line([
        [0.25, -0.5],
        [0.5, -0.66],
      ]);
      dot(0.55, -0.7, 0.09);
      line([
        [-0.38, -0.5],
        [-0.58, -0.7],
        [-0.5, -0.92],
        [-0.25, -0.98],
      ]);
      fill([
        [-0.28, -1.05],
        [-0.1, -0.95],
        [-0.28, -0.88],
      ]);
      dot(-0.05, -0.76, 0.07);
      fill([
        [-0.11, -0.78],
        [0.01, -0.78],
        [-0.05, -0.9],
      ]);
      break;
    }
    case 'jackal': {
      // Anubis : tête de chacal, fendue d'une fêlure (le brisement).
      fill(JACKAL);
      eye(0.12, 0.05);
      line(
        [
          [-0.28, -0.22],
          [-0.12, 0.08],
          [-0.3, 0.36],
          [-0.16, 0.68],
        ],
        dark,
      );
      break;
    }
    case 'cat': {
      // Bastet : tête de chatte de face, et trois coups de griffe (la force).
      dot(-0.28, 0.18, 0.58);
      fill([
        [-0.78, -0.05],
        [-0.72, -0.82],
        [-0.38, -0.36],
      ]);
      fill([
        [-0.18, -0.36],
        [0.16, -0.82],
        [0.22, -0.05],
      ]);
      g.fillStyle(dark, 1)
        .fillEllipse(x - size * 0.5, y + size * 0.1, size * 0.26, size * 0.13)
        .fillEllipse(x - size * 0.06, y + size * 0.1, size * 0.26, size * 0.13);
      fill(
        [
          [-0.36, 0.3],
          [-0.2, 0.3],
          [-0.28, 0.4],
        ],
        dark,
      );
      // prettier-ignore
      line([[0.4, -0.72], [0.52, -0.3], [0.48, 0.05]]);
      // prettier-ignore
      line([[0.62, -0.78], [0.74, -0.36], [0.7, 0]]);
      // prettier-ignore
      line([[0.84, -0.72], [0.96, -0.3], [0.92, 0.05]]);
      break;
    }
    case 'throne': {
      // Isis : déesse coiffée du trône (son nom), l'ânkh (le souffle de vie) devant le visage.
      fill(GODDESS);
      eye(0.18, 0.08);
      line(
        [
          [0.05, -0.27],
          [0, 0.2],
          [-0.05, 0.95],
        ],
        dark,
      );
      fill([
        [-0.35, -0.32],
        [-0.35, -0.98],
        [-0.14, -0.98],
        [-0.14, -0.6],
        [0.22, -0.6],
        [0.22, -0.32],
      ]);
      g.lineStyle(thin, color, 1).strokeEllipse(
        x + size * 0.74,
        y - size * 0.02,
        size * 0.26,
        size * 0.34,
      );
      line([
        [0.56, 0.2],
        [0.92, 0.2],
      ]);
      line([
        [0.74, 0.15],
        [0.74, 0.68],
      ]);
      break;
    }
    case 'shield': {
      // Neith : son emblème, le bouclier aux deux flèches croisées.
      line([
        [-0.8, -0.8],
        [0.8, 0.8],
      ]);
      line([
        [0.8, -0.8],
        [-0.8, 0.8],
      ]);
      fill([
        [-0.95, -0.95],
        [-0.58, -0.82],
        [-0.82, -0.58],
      ]);
      fill([
        [0.95, -0.95],
        [0.82, -0.58],
        [0.58, -0.82],
      ]);
      line([
        [-0.92, 0.66],
        [-0.8, 0.8],
        [-0.66, 0.92],
      ]);
      line([
        [0.92, 0.66],
        [0.8, 0.8],
        [0.66, 0.92],
      ]);
      g.fillStyle(color, 1).fillEllipse(x, y, size * 0.95, size * 1.35);
      g.lineStyle(thin, dark, 1).strokeEllipse(x, y, size * 0.6, size * 1);
      line(
        [
          [-0.3, 0],
          [0.3, 0],
        ],
        dark,
      );
      break;
    }
  }
}

/** Or d'Amon (le roi caché) : son œil et sa faveur royale. */
export const AMON_COLOR = 0xffd36b;

/** L'œil d'Amon : amande, pupille et trait en dessous (forme propre, lisible sans la couleur). */
export function drawAmonEye(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color = AMON_COLOR,
  open = true,
): void {
  g.lineStyle(Math.max(1.5, size / 5), color, 1);
  if (!open) {
    g.lineBetween(x - size, y, x + size, y);
    g.lineBetween(x - size * 0.6, y + size * 0.15, x - size * 0.7, y + size * 0.45);
    g.lineBetween(x + size * 0.6, y + size * 0.15, x + size * 0.7, y + size * 0.45);
    return;
  }
  g.strokeEllipse(x, y, size * 2, size * 1.05);
  g.fillStyle(color, 1).fillCircle(x, y, size * 0.32);
  g.lineBetween(x - size * 0.2, y + size * 0.55, x - size * 0.2, y + size * 1.05);
  g.lineBetween(x - size * 0.2, y + size * 1.05, x + size * 0.45, y + size * 1.2);
}
