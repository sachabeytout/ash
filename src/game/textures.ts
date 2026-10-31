import Phaser from 'phaser';
import { GODS } from '../data/gods';

/** Remplit un polygone (points simples, sans Vector2). */
function fillPoly(g: Phaser.GameObjects.Graphics, pts: readonly { x: number; y: number }[]): void {
  g.beginPath();
  pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
  g.closePath();
  g.fillPath();
}

/** Dessine un sprite pixel à partir de lignes de caractères (un caractère = un pixel). */
function pixelTexture(
  scene: Phaser.Scene,
  key: string,
  rows: readonly string[],
  palette: Record<string, number>,
): void {
  const g = scene.make.graphics({}, false);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (color === undefined) return;
      g.fillStyle(color).fillRect(x, y, 1, 1);
    });
  });
  g.generateTexture(key, rows[0]?.length ?? 1, rows.length);
  g.destroy();
}

function shapeTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): void {
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Ash, à l'égyptienne : cheveux en flamme, diadème d'or, peau bronzée, yeux soulignés de khôl,
// grand collier d'or et de lapis, cœur de braise sur la poitrine, pagne de lin et sandales.
const ASH = [
  '....f..f....',
  '...fFf.Ff...',
  '..fFYFfFYf..',
  '..fFYYFYYf..',
  '..fFFFFFFf..',
  '..gGGGGGGg..',
  '..sSSSSSSs..',
  '..sSeSSeSs..',
  '..sSSSSSSs..',
  '...sSSSSs...',
  '..WbWbbWbW..',
  '.sSSSoOSSSs.',
  '.sSSSSoSSSs.',
  '..gGGGGGGg..',
  '..LLLlLLLL..',
  '..dd....dd..',
];
const ASH_PALETTE = {
  f: 0xff6a1a,
  F: 0xffa040,
  Y: 0xffe08a,
  g: 0xc8962e,
  G: 0xffd36b,
  s: 0x7a5030,
  S: 0xb07848,
  e: 0x1a1424,
  W: 0xffd36b,
  b: 0x2a5aa8,
  o: 0xff7a2a,
  O: 0xffe08a,
  L: 0xe8e0c8,
  l: 0xb8ae90,
  d: 0x3a2a1c,
};

export function ensureGameTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('ash')) return;

  pixelTexture(scene, 'ash', ASH, ASH_PALETTE);

  // Petite flèche qui montre la direction visée.
  shapeTexture(scene, 'pip', 5, 5, (g) => {
    g.fillStyle(0xffe08a).fillTriangle(0, 0, 5, 2.5, 0, 5);
  });

  // Halo doux (fausse lumière, peu coûteuse) : cercles concentriques de plus en plus transparents.
  shapeTexture(scene, 'glow', 64, 64, (g) => {
    for (let r = 32; r > 0; r -= 2) {
      g.fillStyle(0xffffff, 0.035).fillCircle(32, 32, r);
    }
  });

  shapeTexture(scene, 'spark', 3, 3, (g) => {
    g.fillStyle(0xffffff).fillRect(0, 0, 3, 3);
  });

  // Ennemis : corps froids (bleu, sarcelle, violet), yeux pâles. Le rouge est réservé aux dangers.
  // Pilleur de tombes : capuche pointue, visage dans l'ombre, petite dague.
  shapeTexture(scene, 'prowler', 16, 16, (g) => {
    g.fillStyle(0x10142a).fillCircle(8, 9, 7).fillTriangle(1, 9, 8, 0, 15, 9);
    g.fillStyle(0x6b8cff).fillCircle(8, 9, 5.5).fillTriangle(3, 9, 8, 2, 13, 9);
    g.fillStyle(0x10142a).fillRect(4, 7, 8, 4);
    g.fillStyle(0xe8f0ff).fillRect(5, 8, 2, 1.5).fillRect(9, 8, 2, 1.5);
    g.fillStyle(0xd8d0c0).fillTriangle(13, 12, 16, 15, 12, 14);
  });
  // Statue-sentinelle : tête de pierre coiffée du némès, yeux qui s'allument avant le tir.
  shapeTexture(scene, 'gunner', 14, 14, (g) => {
    g.fillStyle(0x0c1f1c).fillRect(0, 2, 14, 12).fillRect(2, 0, 10, 3);
    g.fillStyle(0x4de1c1).fillRect(1, 3, 12, 10).fillRect(3, 1, 8, 3);
    g.fillStyle(0x2a8f7c).fillRect(1, 3, 2, 10).fillRect(11, 3, 2, 10);
    g.fillStyle(0x0c1f1c).fillRect(4, 6, 6, 2);
    g.fillStyle(0xe8fffb).fillRect(4.5, 6.5, 2, 1).fillRect(7.5, 6.5, 2, 1);
    g.fillStyle(0x2a8f7c).fillRect(6, 10, 2, 3);
  });
  // Colosse de granit : bloc de pierre taillé, coiffe de pharaon, barbe droite.
  shapeTexture(scene, 'brute', 26, 26, (g) => {
    g.fillStyle(0x160f26).fillRoundedRect(1, 3, 24, 23, 6);
    g.fillStyle(0x9a6bff).fillRoundedRect(3, 5, 20, 19, 5);
    g.fillStyle(0x5d3fa8).fillRect(7, 0, 12, 7);
    g.fillStyle(0x9a6bff).fillRect(9, 1, 8, 5);
    g.fillStyle(0xf2eaff).fillRect(8, 11, 3, 3).fillRect(15, 11, 3, 3);
    g.fillStyle(0x5d3fa8).fillRect(5, 17, 16, 2).fillRect(11, 19, 4, 4);
    g.fillStyle(0x7a54d8).fillRect(4, 8, 1, 10).fillRect(21, 8, 1, 10);
  });

  // Élite (Chasseur d'Apophis) : losange à lames latérales, capuchon de cobra, œil unique.
  shapeTexture(scene, 'stalker', 22, 22, (g) => {
    g.fillStyle(0x140f24).fillTriangle(11, 0, 22, 11, 11, 22).fillTriangle(11, 0, 0, 11, 11, 22);
    g.fillStyle(0xb8a8ff).fillTriangle(11, 2, 20, 11, 11, 20).fillTriangle(11, 2, 2, 11, 11, 20);
    g.fillStyle(0x6d5cc8).fillRect(3, 10, 16, 2);
    g.fillStyle(0x140f24).fillEllipse(11, 7, 8, 9);
    g.fillStyle(0x6d5cc8).fillEllipse(11, 7, 6, 7);
    g.fillStyle(0xf6f2ff).fillCircle(11, 8, 1.8);
  });

  // Ammit : crinière sombre, corps violet, gueule de crocodile tournée vers la droite (retournée selon la visée).
  shapeTexture(scene, 'ammit', 48, 44, (g) => {
    g.fillStyle(0x0f0b1c).fillCircle(20, 22, 20);
    g.fillStyle(0x2d6b78).fillCircle(20, 22, 18);
    g.fillStyle(0x7a68d8).fillCircle(20, 22, 14);
    g.fillStyle(0x4f40a8).fillRect(28, 15, 20, 14);
    g.fillStyle(0x0f0b1c).fillRect(30, 21, 18, 2);
    g.fillStyle(0xf2ecff);
    for (let x = 31; x < 47; x += 4)
      g.fillTriangle(x, 15, x + 2, 15, x + 1, 19).fillTriangle(x, 29, x + 2, 29, x + 1, 25);
    g.fillStyle(0xf6f2ff).fillCircle(26, 16, 2.4).fillCircle(26, 28, 2.4);
    g.fillStyle(0x0f0b1c).fillCircle(26.6, 16, 1).fillCircle(26.6, 28, 1);
    g.fillStyle(0x5a9fae).fillTriangle(4, 8, 10, 2, 12, 10).fillTriangle(4, 36, 10, 42, 12, 34);
  });

  // Chacal de nuit : museau long vers la droite, deux grandes oreilles dressées.
  shapeTexture(scene, 'wolfbot', 16, 16, (g) => {
    g.fillStyle(0x0d1424).fillEllipse(6, 10, 12, 9).fillTriangle(8, 6, 16, 10, 8, 13);
    g.fillStyle(0x6a7ab8).fillEllipse(6, 10, 10, 7).fillTriangle(9, 7, 15, 10, 9, 12);
    g.fillStyle(0x0d1424).fillTriangle(2, 7, 3, 0, 6, 6).fillTriangle(5, 6, 7, 0, 9, 6);
    g.fillStyle(0x9ab4ff).fillTriangle(3, 6, 3.5, 2, 5, 6).fillTriangle(6, 6, 7, 2, 8, 6);
    g.fillStyle(0xeaf2ff).fillRect(9, 8, 2, 1);
  });
  // Prêtresse du froid : robe sombre à capuche, orbe de glace noire entre les mains.
  shapeTexture(scene, 'frostcaster', 16, 16, (g) => {
    g.fillStyle(0x0b1f1e).fillTriangle(8, 0, 1, 16, 15, 16);
    g.fillStyle(0x2e5f86).fillTriangle(8, 2, 3, 15, 13, 15);
    g.fillStyle(0x0b1f1e).fillCircle(8, 5, 3);
    g.fillStyle(0xeafffb).fillRect(7, 5, 1, 1).fillRect(9, 5, 1, 1);
    g.fillStyle(0x6fd6c8).fillCircle(8, 11, 2.5);
    g.fillStyle(0xeafffb).fillRect(7.5, 10, 1, 1);
  });
  // Graveur de hiéroglyphes : bloc de pierre, un œil gravé.
  shapeTexture(scene, 'runewarden', 22, 22, (g) => {
    g.fillStyle(0x0e1622).fillRoundedRect(0, 0, 22, 22, 4);
    g.fillStyle(0x7a9cc6).fillRoundedRect(2, 2, 18, 18, 3);
    g.lineStyle(1.5, 0x3d5a80, 1).strokeEllipse(11, 9, 12, 6);
    g.fillStyle(0x3d5a80).fillCircle(11, 9, 1.8).fillRect(9, 12, 1.5, 4).fillRect(12, 12, 4, 1.5);
    g.fillStyle(0xeaf2ff).fillRect(6, 16, 2, 2).fillRect(14, 16, 2, 2);
  });
  // Medjay maudit (élite) : ancien garde du pharaon, coiffe rayée qui tombe sur les épaules.
  shapeTexture(scene, 'einherjar', 22, 22, (g) => {
    g.fillStyle(0x10141f).fillCircle(11, 12, 10);
    g.fillStyle(0xd0d8ff).fillCircle(11, 12, 8);
    g.fillStyle(0x3a5aa8).fillTriangle(2, 20, 6, 4, 9, 20).fillTriangle(20, 20, 16, 4, 13, 20);
    g.fillStyle(0xf2e6c8)
      .fillRect(3, 9, 3, 1.5)
      .fillRect(3, 14, 3, 1.5)
      .fillRect(16, 9, 3, 1.5)
      .fillRect(16, 14, 3, 1.5);
    g.fillStyle(0x3a5aa8).fillRect(5, 3, 12, 4);
    g.fillStyle(0xf2e6c8).fillRect(5, 5, 12, 1);
    g.fillStyle(0x10141f).fillRect(8, 11, 6, 1.5);
  });

  // Shezmu, le Bourreau : tête de lion (crinière sombre), corps de bourreau, deux lames dorées en
  // croissant ; museau tourné vers la droite (retourné selon la visée). Jamais le rouge des dangers.
  shapeTexture(scene, 'shezmu', 50, 44, (g) => {
    // Lames en croissant, derrière le corps.
    g.fillStyle(0xffe08a).fillTriangle(2, 6, 14, 14, 6, 2).fillTriangle(2, 38, 14, 30, 6, 42);
    g.fillStyle(0x0b0a10).fillTriangle(5, 6, 14, 14, 7, 4).fillTriangle(5, 38, 14, 30, 7, 40);
    // Corps (pagne sombre, torse ocre).
    g.fillStyle(0x0b0a10).fillCircle(20, 22, 18);
    g.fillStyle(0x7a4a2a).fillCircle(20, 22, 16);
    g.fillStyle(0x3a2440).fillRect(8, 26, 24, 10);
    g.fillStyle(0xffe08a).fillRect(8, 26, 24, 2);
    // Crinière et tête de lion.
    g.fillStyle(0x0b0a10).fillCircle(31, 20, 13);
    g.fillStyle(0x8a5a20).fillCircle(31, 20, 12);
    g.fillStyle(0xd8a050).fillCircle(34, 20, 8);
    g.fillStyle(0xd8a050).fillRoundedRect(36, 16, 12, 9, 3);
    g.fillStyle(0x0b0a10).fillRect(46, 19, 3, 3);
    g.fillStyle(0xf6f2ff).fillCircle(37, 17, 2);
    g.fillStyle(0x0f0b1c).fillCircle(37.6, 17, 1);
    g.fillStyle(0x0b0a10).fillRect(39, 23, 8, 1.5);
  });

  // Momie de garde (Douât) : tête bandée, yeux sombres, lance pointée vers la droite.
  shapeTexture(scene, 'hoplite', 22, 16, (g) => {
    g.fillStyle(0x1a1610).fillCircle(8, 8, 8);
    g.fillStyle(0xe8dcc0).fillCircle(8, 8, 6.5);
    g.lineStyle(1, 0xb8aa88, 1)
      .lineBetween(2, 5, 14, 4)
      .lineBetween(2, 9, 14, 10)
      .lineBetween(3, 12, 13, 13);
    g.fillStyle(0x1a1610).fillRect(5, 6, 2, 2).fillRect(9, 6, 2, 2);
    g.fillStyle(0xc8a050).fillRect(12, 7, 9, 2);
    g.fillStyle(0xffe08a).fillTriangle(19, 5, 22, 8, 19, 11);
  });
  // Ba égaré (Douât) : oiseau à tête humaine, l'âme d'un mort qui erre.
  shapeTexture(scene, 'harpy', 18, 14, (g) => {
    g.fillStyle(0x140f1c).fillTriangle(0, 0, 9, 9, 0, 14).fillTriangle(18, 0, 9, 9, 18, 14);
    g.fillStyle(0xc8a0ff).fillTriangle(1, 2, 8, 8, 1, 12).fillTriangle(17, 2, 10, 8, 17, 12);
    g.fillStyle(0xd8a070).fillCircle(9, 7, 3);
    g.fillStyle(0x2a2048).fillRect(7, 4, 4, 2);
    g.fillStyle(0x140f1c).fillRect(8, 7, 1, 1).fillRect(10, 7, 1, 1);
  });
  // Prophète de l'Isfet (Douât) : visage voilé, œil-lentille, serpent dressé sur le front.
  shapeTexture(scene, 'oracle', 16, 16, (g) => {
    g.fillStyle(0x140f24).fillCircle(8, 8, 8);
    g.fillStyle(0xb8a0e8).fillCircle(8, 8, 6.5);
    g.fillStyle(0x4a3478).fillRect(3, 9, 10, 4);
    g.fillStyle(0xffffff).fillCircle(8, 6, 2);
    g.fillStyle(0xffb02e).fillRect(7.5, 0, 1, 3).fillRect(7, 0, 2, 1);
  });
  // Gardien des portes (élite, Douât) : tête sombre, yeux de braise, deux lames croisées au-dessus.
  shapeTexture(scene, 'minotaur', 26, 24, (g) => {
    g.fillStyle(0x1a120c).fillCircle(13, 13, 11);
    g.fillStyle(0x4a3858).fillCircle(13, 13, 9);
    g.fillStyle(0xffe08a).fillTriangle(1, 1, 4, 0, 13, 10).fillTriangle(25, 1, 22, 0, 13, 10);
    g.fillStyle(0x1a120c).fillRoundedRect(8, 15, 10, 6, 2);
    g.fillStyle(0xffb02e).fillRect(8, 11, 3, 2).fillRect(15, 11, 3, 2);
  });
  // Apophis : le grand serpent enroulé (anneaux d'écailles sombres), tête dressée vers la droite,
  // œil d'or, crochets. Jamais le rouge des dangers.
  shapeTexture(scene, 'apophis', 56, 52, (g) => {
    g.fillStyle(0x0c0812).fillCircle(24, 28, 23);
    g.fillStyle(0x3a2458).fillCircle(24, 28, 21);
    g.fillStyle(0x2a1840).fillCircle(24, 28, 15);
    g.fillStyle(0x3a2458).fillCircle(24, 28, 10);
    g.fillStyle(0x2a1840).fillCircle(24, 28, 5);
    g.lineStyle(1, 0x8a6ab8, 0.8)
      .strokeCircle(24, 28, 18)
      .strokeCircle(24, 28, 12.5)
      .strokeCircle(24, 28, 7.5);
    // Cou et tête.
    g.fillStyle(0x0c0812).fillRoundedRect(30, 8, 12, 22, 5);
    g.fillStyle(0x3a2458).fillRoundedRect(31, 9, 10, 20, 4);
    g.fillStyle(0x0c0812).fillRoundedRect(34, 2, 22, 14, 6);
    g.fillStyle(0x4a3070).fillRoundedRect(35, 3, 20, 12, 5);
    g.fillStyle(0xffe08a).fillEllipse(44, 7, 6, 4);
    g.fillStyle(0x0c0812).fillRect(43.5, 5.5, 1, 3);
    g.fillStyle(0xf6f2ff).fillTriangle(50, 14, 52, 14, 51, 18).fillTriangle(46, 14, 48, 14, 47, 17);
  });
  // Sol de la Douât (texture de réserve ; le sol affiché est uni).
  shapeTexture(scene, 'floorMarble', 32, 32, (g) => {
    g.fillStyle(0x15120c).fillRect(0, 0, 32, 32);
    g.fillStyle(0x1c1810).fillRect(1, 1, 30, 30);
    g.fillStyle(0x3a3320).fillRect(0, 0, 32, 1).fillRect(0, 0, 1, 32);
    g.fillStyle(0x6a5a30).fillRect(4, 10, 9, 1).fillRect(12, 11, 6, 1).fillRect(20, 23, 8, 1);
    g.fillStyle(0xffe08a).fillRect(0, 0, 2, 2);
  });

  // Pyramide aux cages : les créatures d'acier de l'Oiseleur (étrangères à l'Égypte).
  // Hirondelle d'acier : ailes en flèche, queue fourchue.
  shapeTexture(scene, 'sparrow', 12, 10, (g) => {
    g.fillStyle(0x10121e).fillTriangle(0, 0, 12, 5, 0, 10);
    g.fillStyle(0xb8c8ff).fillTriangle(2, 2, 10, 5, 2, 8);
    g.fillStyle(0x10121e).fillTriangle(0, 3, 3, 5, 0, 7);
    g.fillStyle(0xf2f6ff).fillRect(6, 4, 2, 2);
  });
  // Vautour-sentinelle : larges ailes, tête nue et pâle, bec crochu.
  shapeTexture(scene, 'crow', 18, 14, (g) => {
    g.fillStyle(0x0e0b18).fillTriangle(0, 7, 18, 0, 18, 14).fillTriangle(0, 0, 10, 7, 0, 14);
    g.fillStyle(0x8f86c8).fillTriangle(2, 7, 17, 1, 17, 13);
    g.fillStyle(0xe8dcc8).fillCircle(13, 7, 3);
    g.fillStyle(0xffe08a).fillTriangle(15, 6, 18, 7, 15, 8);
    g.fillStyle(0x0e0b18).fillCircle(13, 6.5, 1);
  });
  // Geôlier : cage portative (barreaux) autour d'un œil.
  shapeTexture(scene, 'jailer', 22, 22, (g) => {
    g.fillStyle(0x120e1c).fillRoundedRect(0, 0, 22, 22, 6);
    g.fillStyle(0xa890d8).fillRoundedRect(2, 2, 18, 18, 5);
    g.fillStyle(0x4a3a78).fillRect(5, 3, 2, 16).fillRect(10, 3, 2, 16).fillRect(15, 3, 2, 16);
    g.fillStyle(0xf6f2ff).fillCircle(11, 11, 2.5);
  });
  // Embaumeur (soutien) : masque de chacal, bandelettes, ânkh de vie.
  shapeTexture(scene, 'mender', 16, 16, (g) => {
    g.fillStyle(0x0c1a12)
      .fillCircle(8, 9, 7)
      .fillTriangle(3, 6, 4, 0, 7, 5)
      .fillTriangle(9, 5, 12, 0, 13, 6);
    g.fillStyle(0x7fe0a0).fillCircle(8, 9, 5.5);
    g.lineStyle(1, 0xd8f0dc, 1).lineBetween(3, 8, 13, 7).lineBetween(3, 11, 13, 12);
    g.fillStyle(0xf0fff4).fillRect(7.5, 9, 1, 4).fillRect(6, 10, 4, 1);
    g.lineStyle(1, 0xf0fff4, 1).strokeCircle(8, 7.5, 1.5);
  });
  // Porteur d'amulettes (soutien) : plaque bleu clair, œil oudjat protecteur.
  shapeTexture(scene, 'warder', 16, 16, (g) => {
    g.fillStyle(0x0c1424).fillRoundedRect(0, 0, 16, 16, 3);
    g.fillStyle(0x9ec8ff).fillRoundedRect(1.5, 1.5, 13, 13, 3);
    g.lineStyle(1.5, 0x24406a, 1).strokeEllipse(8, 7, 10, 5);
    g.fillStyle(0x24406a).fillCircle(8, 7, 1.6).fillRect(6, 9, 1.5, 4).fillRect(9, 10, 4, 1.5);
  });
  // Sauterelle : long corps, grandes pattes arrière, antennes.
  shapeTexture(scene, 'leaper', 18, 18, (g) => {
    g.fillStyle(0x140f24).fillEllipse(9, 9, 8, 15);
    g.fillStyle(0xb0a0ff).fillEllipse(9, 9, 6, 13);
    g.fillStyle(0x5a4a9a).fillTriangle(4, 10, 0, 17, 3, 17).fillTriangle(14, 10, 18, 17, 15, 17);
    g.lineStyle(1, 0x5a4a9a, 1).lineBetween(8, 2, 5, 0).lineBetween(10, 2, 13, 0);
    g.fillStyle(0xf4f0ff).fillRect(7, 4, 1.5, 1.5).fillRect(9.5, 4, 1.5, 1.5);
  });
  // Scarabée cracheur : carapace en deux élytres, pattes, huit bouches tout autour.
  shapeTexture(scene, 'diffuser', 18, 18, (g) => {
    g.fillStyle(0x0a1820).fillEllipse(9, 10, 14, 16).fillCircle(9, 3, 3);
    g.fillStyle(0x60d0ff).fillEllipse(9, 10, 12, 14);
    g.lineStyle(1, 0x0a1820, 1).lineBetween(9, 4, 9, 17);
    g.lineStyle(1, 0x0a1820, 1)
      .lineBetween(3, 8, 0, 6)
      .lineBetween(15, 8, 18, 6)
      .lineBetween(3, 12, 0, 13)
      .lineBetween(15, 12, 18, 13);
    g.fillStyle(0x0a1820);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.fillCircle(9 + Math.cos(a) * 5, 10 + Math.sin(a) * 5.5, 1);
    }
    g.fillStyle(0xe8f8ff).fillCircle(9, 3, 1.4);
  });
  // Sphinx enchaîné (élite) : gardien de la pyramide, némès rayé or et lapis, barbe postiche,
  // collier de chaîne mauve de l'Oiseleur.
  shapeTexture(scene, 'herald', 22, 22, (g) => {
    g.fillStyle(0x120c06);
    fillPoly(g, [
      { x: 1, y: 21 },
      { x: 21, y: 21 },
      { x: 18, y: 5 },
      { x: 11, y: 0 },
      { x: 4, y: 5 },
    ]);
    g.fillStyle(0xd8a840);
    fillPoly(g, [
      { x: 3, y: 20 },
      { x: 19, y: 20 },
      { x: 17, y: 6 },
      { x: 11, y: 2 },
      { x: 5, y: 6 },
    ]);
    g.fillStyle(0x2a4a9a);
    for (const y of [6, 10, 14, 18]) g.fillRect(3, y, 3, 1.5).fillRect(16, y, 3, 1.5);
    g.fillRect(6, 4, 10, 1.5);
    g.fillStyle(0xc89a60).fillRoundedRect(7, 6, 8, 10, 2);
    g.fillStyle(0x120c06).fillRect(8, 9, 2.5, 1.5).fillRect(11.5, 9, 2.5, 1.5);
    g.fillStyle(0x40d0c0).fillRect(8.5, 9.2, 1, 1).fillRect(12, 9.2, 1, 1);
    g.fillStyle(0x8a6a3a).fillRect(10, 15, 2, 4);
    g.lineStyle(1, 0xd8b8ff, 1);
    for (let x = 5; x <= 17; x += 3) g.strokeEllipse(x, 18.5, 3, 2);
  });
  // L'Oiseleur : capuche, grandes ailes de filet, visage d'or (tourné vers la droite).
  shapeTexture(scene, 'oiseleur', 52, 48, (g) => {
    g.fillStyle(0x0c0914).fillTriangle(0, 4, 26, 24, 0, 44).fillTriangle(52, 4, 26, 24, 52, 44);
    g.lineStyle(1, 0xd8b8ff, 0.8);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(2, 8 + i * 9, 22, 22 + i * 2).lineBetween(50, 8 + i * 9, 30, 22 + i * 2);
    }
    g.fillStyle(0x0c0914).fillCircle(26, 24, 15);
    g.fillStyle(0x3a2a5a).fillCircle(26, 24, 13);
    g.fillStyle(0xffe08a).fillRoundedRect(26, 18, 12, 12, 4);
    g.fillStyle(0x0c0914).fillRect(30, 21, 2, 2).fillRect(30, 26, 2, 2);
    g.fillStyle(0xd8b8ff).fillTriangle(38, 22, 44, 24, 38, 26);
  });
  // Sol du Comptoir de Ratatosk : planches chaudes et racines.
  shapeTexture(scene, 'floorRoots', 32, 32, (g) => {
    g.fillStyle(0x1a120a).fillRect(0, 0, 32, 32);
    g.fillStyle(0x241810).fillRect(0, 0, 32, 7).fillRect(0, 8, 32, 7);
    g.fillStyle(0x2a1c12).fillRect(0, 16, 32, 7).fillRect(0, 24, 32, 7);
    g.fillStyle(0x3a2818).fillRect(12, 0, 1, 7).fillRect(26, 8, 1, 7);
    g.fillStyle(0x3a2818).fillRect(6, 16, 1, 7).fillRect(20, 24, 1, 7);
    g.fillStyle(0xffc46b).fillRect(30, 30, 1, 1);
  });
  // Projectiles d'Ash : couleurs chaudes (jamais le rouge-magenta des ennemis).
  shapeTexture(scene, 'p_orb', 9, 9, (g) => {
    g.fillStyle(0xffd27a, 0.5).fillCircle(4.5, 4.5, 4.5);
    g.fillStyle(0xfff2d0).fillCircle(4.5, 4.5, 2.5);
  });
  shapeTexture(scene, 'p_bolt', 12, 4, (g) => {
    g.fillStyle(0xff9f6a).fillRect(0, 1, 9, 2);
    g.fillStyle(0xfff2d0).fillTriangle(8, 0, 12, 2, 8, 4);
  });
  // Flèche de don : argent de lune, avec empennage (forme distincte du carreau).
  shapeTexture(scene, 'p_arrow', 14, 6, (g) => {
    g.fillStyle(GODS.neith.color).fillRect(2, 2, 9, 2);
    g.fillStyle(0xffffff).fillTriangle(10, 0, 14, 3, 10, 6);
    g.fillStyle(GODS.neith.color, 0.7)
      .fillTriangle(0, 0, 3, 3, 0, 3)
      .fillTriangle(0, 6, 3, 3, 0, 3);
  });
  shapeTexture(scene, 'p_disc', 13, 13, (g) => {
    g.fillStyle(0xffe08a).fillCircle(6.5, 6.5, 6.5);
    g.fillStyle(0x7a4a10).fillCircle(6.5, 6.5, 2.5);
    g.fillStyle(0xfff2d0)
      .fillRect(6, 0, 1, 3)
      .fillRect(6, 10, 1, 3)
      .fillRect(0, 6, 3, 1)
      .fillRect(10, 6, 3, 1);
  });
  shapeTexture(scene, 'p_chain', 9, 7, (g) => {
    g.fillStyle(0xffb86a).fillTriangle(0, 0, 9, 3.5, 0, 7);
    g.fillStyle(0xfff2d0).fillRect(1, 3, 4, 1);
  });

  // Projectile ennemi : losange magenta à cœur blanc (forme + couleur).
  shapeTexture(scene, 'shot', 9, 9, (g) => {
    g.fillStyle(0xff2a6d).fillTriangle(4.5, 0, 9, 4.5, 4.5, 9).fillTriangle(4.5, 0, 0, 4.5, 4.5, 9);
    g.fillStyle(0xffffff).fillRect(3, 3, 3, 3);
  });

  // Sol du Nil de minuit (texture de réserve ; le sol affiché est uni).
  shapeTexture(scene, 'floorIce', 32, 32, (g) => {
    g.fillStyle(0x0a1220).fillRect(0, 0, 32, 32);
    g.fillStyle(0x0e1a2c).fillRect(1, 1, 30, 30);
    g.fillStyle(0x1f3a52).fillRect(0, 0, 32, 1).fillRect(0, 0, 1, 32);
    g.fillStyle(0x6fb8d0).fillRect(0, 0, 2, 2);
    g.fillStyle(0x2c5470).fillRect(6, 24, 4, 1).fillRect(20, 9, 5, 1);
    g.fillStyle(0x8ff0ff).fillRect(27, 27, 1, 1);
  });

  // Sol : dalles sombres avec une grille néon discrète.
  shapeTexture(scene, 'floor', 32, 32, (g) => {
    g.fillStyle(0x0c0a15).fillRect(0, 0, 32, 32);
    g.fillStyle(0x110e1e).fillRect(1, 1, 30, 30);
    g.fillStyle(0x1b1631).fillRect(0, 0, 32, 1).fillRect(0, 0, 1, 32);
    g.fillStyle(0x2a2048).fillRect(0, 0, 2, 2);
  });
}
