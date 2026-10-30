import Phaser from 'phaser';

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

// Ash : capuche, visage dans l'ombre, yeux de braise, cœur incandescent.
const ASH = [
  '....hhhh....',
  '...hHHHHh...',
  '..hHHHHHHh..',
  '..hHssssHh..',
  '..hseSSesh..',
  '..hHssssHh..',
  '...hcooch...',
  '..cCoOOoCc..',
  '.cCCCoOCCCc.',
  '.cCCCCoCCCc.',
  '.cCCCCCCCCc.',
  '..cCCCCCCc..',
  '..cCC..CCc..',
  '..dd....dd..',
];
const ASH_PALETTE = {
  h: 0x1a1424,
  H: 0x3d3158,
  s: 0x120e1a,
  S: 0x120e1a,
  e: 0xffc04a,
  c: 0x1a1424,
  C: 0x2e2545,
  o: 0xff7a2a,
  O: 0xffe08a,
  d: 0x0e0b14,
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
  shapeTexture(scene, 'prowler', 16, 16, (g) => {
    g.fillStyle(0x10142a).fillCircle(8, 8, 8);
    g.fillStyle(0x6b8cff).fillCircle(8, 8, 6.5);
    g.fillStyle(0x3a4fa8).fillTriangle(2, 4, 5, 0, 7, 4).fillTriangle(9, 4, 11, 0, 14, 4);
    g.fillStyle(0xe8f0ff).fillRect(5, 7, 2, 2).fillRect(9, 7, 2, 2);
  });
  shapeTexture(scene, 'gunner', 14, 14, (g) => {
    g.fillStyle(0x0c1f1c).fillRect(0, 2, 14, 10);
    g.fillStyle(0x4de1c1).fillRect(1, 3, 12, 8);
    g.fillStyle(0x0c1f1c).fillCircle(7, 7, 3.2);
    g.fillStyle(0xe8fffb).fillCircle(7, 7, 1.6);
    g.fillStyle(0x2a8f7c)
      .fillRect(0, 0, 3, 3)
      .fillRect(11, 0, 3, 3)
      .fillRect(0, 11, 3, 3)
      .fillRect(11, 11, 3, 3);
  });
  shapeTexture(scene, 'brute', 26, 26, (g) => {
    g.fillStyle(0x160f26).fillCircle(13, 13, 13);
    g.fillStyle(0x9a6bff).fillCircle(13, 13, 11);
    g.fillStyle(0x5d3fa8).fillRect(4, 5, 18, 5);
    g.fillStyle(0xf2eaff).fillRect(8, 11, 3, 3).fillRect(15, 11, 3, 3);
    g.fillStyle(0x5d3fa8).fillRect(6, 18, 14, 3);
  });

  // Élite (Traqueur) : losange pâle à lames latérales, œil unique.
  shapeTexture(scene, 'stalker', 22, 22, (g) => {
    g.fillStyle(0x140f24).fillTriangle(11, 0, 22, 11, 11, 22).fillTriangle(11, 0, 0, 11, 11, 22);
    g.fillStyle(0xb8a8ff).fillTriangle(11, 2, 20, 11, 11, 20).fillTriangle(11, 2, 2, 11, 11, 20);
    g.fillStyle(0x6d5cc8).fillRect(3, 10, 16, 2);
    g.fillStyle(0xf6f2ff).fillCircle(11, 9, 2.2);
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

  // Projectile ennemi : losange magenta à cœur blanc (forme + couleur).
  shapeTexture(scene, 'shot', 9, 9, (g) => {
    g.fillStyle(0xff2a6d).fillTriangle(4.5, 0, 9, 4.5, 4.5, 9).fillTriangle(4.5, 0, 0, 4.5, 4.5, 9);
    g.fillStyle(0xffffff).fillRect(3, 3, 3, 3);
  });

  // Sol du Givre-Serveur : dalles bleu nuit, joints givrés, petites LED de serveur.
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
