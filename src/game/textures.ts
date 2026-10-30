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

  // Givre-Serveur. Loup-relais : tête de loup anguleuse, oreilles en pointe.
  shapeTexture(scene, 'wolfbot', 16, 16, (g) => {
    g.fillStyle(0x0d1424).fillTriangle(0, 3, 16, 8, 0, 13).fillRect(0, 3, 6, 10);
    g.fillStyle(0x9ab4ff).fillTriangle(1, 4, 14, 8, 1, 12);
    g.fillStyle(0x5a74c0).fillTriangle(1, 4, 4, 0, 6, 5).fillTriangle(1, 12, 4, 16, 6, 11);
    g.fillStyle(0xeaf2ff).fillRect(6, 6, 2, 1).fillRect(6, 9, 2, 1);
  });
  // Givreur : cristal hexagonal, cœur pâle.
  shapeTexture(scene, 'frostcaster', 16, 16, (g) => {
    const hex = (r: number) =>
      [0, 1, 2, 3, 4, 5].map(
        (i) =>
          new Phaser.Math.Vector2(
            8 + Math.cos((i * Math.PI) / 3) * r,
            8 + Math.sin((i * Math.PI) / 3) * r,
          ),
      );
    g.fillStyle(0x0b1f1e).fillPoints(hex(8), true);
    g.fillStyle(0x6fd6c8).fillPoints(hex(6.5), true);
    g.fillStyle(0x2e8f86).fillPoints(hex(3.5), true);
    g.fillStyle(0xeafffb).fillRect(7, 7, 2, 2);
  });
  // Gardien runique : bloc de pierre, rune gravée.
  shapeTexture(scene, 'runewarden', 22, 22, (g) => {
    g.fillStyle(0x0e1622).fillRoundedRect(0, 0, 22, 22, 4);
    g.fillStyle(0x7a9cc6).fillRoundedRect(2, 2, 18, 18, 3);
    g.fillStyle(0x3d5a80).fillRect(10, 5, 2, 12).fillRect(6, 8, 10, 2);
    g.fillStyle(0xeaf2ff).fillRect(6, 13, 2, 2).fillRect(14, 13, 2, 2);
  });
  // Einherjar (élite) : casque à cornes, visière fine.
  shapeTexture(scene, 'einherjar', 22, 22, (g) => {
    g.fillStyle(0x10141f).fillCircle(11, 12, 10);
    g.fillStyle(0xd0d8ff).fillCircle(11, 12, 8);
    g.fillStyle(0x8a94c0).fillRect(4, 11, 14, 3);
    g.fillStyle(0x10141f).fillRect(6, 12, 10, 1);
    g.fillStyle(0xf2e6c8).fillTriangle(2, 9, 0, 1, 6, 6).fillTriangle(20, 9, 22, 1, 16, 6);
  });

  // Fenrir-Ω : loup d'acier, crinière givrée, collier à maillons, gueule tournée vers la droite.
  shapeTexture(scene, 'fenrir', 50, 44, (g) => {
    g.fillStyle(0x0b0f1a).fillCircle(20, 22, 20);
    g.fillStyle(0xd8f0ff).fillCircle(20, 22, 18);
    g.fillStyle(0x8fa4c8).fillCircle(20, 22, 14);
    g.fillStyle(0x0b0f1a).fillTriangle(26, 12, 50, 22, 26, 32);
    g.fillStyle(0x6f84a8).fillTriangle(27, 14, 47, 22, 27, 30);
    g.fillStyle(0xf2f8ff);
    for (let x = 31; x < 45; x += 4) g.fillTriangle(x, 21, x + 2, 21, x + 1, 24);
    g.fillStyle(0x8ff0ff).fillCircle(27, 16, 2.4).fillCircle(27, 28, 2.4);
    g.fillStyle(0x6d7891).fillRect(10, 8, 4, 28).fillRect(8, 12, 8, 3).fillRect(8, 28, 8, 3);
    g.fillStyle(0xd8f0ff).fillTriangle(6, 6, 12, 0, 14, 8).fillTriangle(6, 38, 12, 44, 14, 36);
  });

  // Olympe Corporatif. Hoplite-Sécurité : casque à crête, lance pointée vers la droite.
  shapeTexture(scene, 'hoplite', 22, 16, (g) => {
    g.fillStyle(0x1a1610).fillCircle(8, 8, 8);
    g.fillStyle(0xe8d9a8).fillCircle(8, 8, 6.5);
    g.fillStyle(0x9a8450).fillRect(2, 2, 12, 3);
    g.fillStyle(0x1a1610).fillRect(5, 7, 6, 2);
    g.fillStyle(0xc8c8d0).fillRect(12, 7, 9, 2);
    g.fillStyle(0xf2f2f8).fillTriangle(19, 5, 22, 8, 19, 11);
  });
  // Harpie-drone : ailes de verre en V, œil central.
  shapeTexture(scene, 'harpy', 18, 14, (g) => {
    g.fillStyle(0x0d1820).fillTriangle(0, 0, 9, 9, 0, 14).fillTriangle(18, 0, 9, 9, 18, 14);
    g.fillStyle(0x9fe0ff).fillTriangle(1, 2, 8, 8, 1, 12).fillTriangle(17, 2, 10, 8, 17, 12);
    g.fillStyle(0xf2fbff).fillCircle(9, 8, 2.5);
  });
  // Oracle : visage voilé dans un cercle de lumière, œil-lentille.
  shapeTexture(scene, 'oracle', 16, 16, (g) => {
    g.fillStyle(0x140f24).fillCircle(8, 8, 8);
    g.fillStyle(0xc8b8ff).fillCircle(8, 8, 6.5);
    g.fillStyle(0x6a58b8).fillRect(3, 9, 10, 4);
    g.fillStyle(0xffffff).fillCircle(8, 6, 2);
  });
  // Minotaure-Ω (élite) : tête de taureau, cornes dorées.
  shapeTexture(scene, 'minotaur', 26, 24, (g) => {
    g.fillStyle(0x1a120c).fillCircle(13, 13, 11);
    g.fillStyle(0xd8b48a).fillCircle(13, 13, 9);
    g.fillStyle(0xffe08a).fillTriangle(2, 10, 0, 0, 7, 6).fillTriangle(24, 10, 26, 0, 19, 6);
    g.fillStyle(0x8a6a48).fillRoundedRect(8, 15, 10, 6, 2);
    g.fillStyle(0x1a120c).fillRect(10, 17, 2, 2).fillRect(14, 17, 2, 2);
    g.fillStyle(0xf6f2ff).fillRect(8, 10, 3, 2).fillRect(15, 10, 3, 2);
  });
  // Talos : colosse de bronze, visière lumineuse (les yeux tournés vers la droite).
  shapeTexture(scene, 'talos', 56, 52, (g) => {
    g.fillStyle(0x16100a).fillRoundedRect(4, 2, 46, 48, 10);
    g.fillStyle(0xb8864a).fillRoundedRect(6, 4, 42, 44, 9);
    g.fillStyle(0x8a5e30).fillRect(10, 30, 34, 6).fillRect(24, 8, 6, 40);
    g.fillStyle(0x16100a).fillRect(30, 14, 18, 8);
    g.fillStyle(0xffe08a).fillRect(32, 16, 14, 4);
    g.fillStyle(0xd8a868).fillCircle(10, 10, 4).fillCircle(10, 42, 4);
    g.fillStyle(0xffe08a).fillRect(50, 17, 6, 2);
  });
  // Sol de l'Olympe : marbre sombre, veines dorées, joints de verre.
  shapeTexture(scene, 'floorMarble', 32, 32, (g) => {
    g.fillStyle(0x15120c).fillRect(0, 0, 32, 32);
    g.fillStyle(0x1c1810).fillRect(1, 1, 30, 30);
    g.fillStyle(0x3a3320).fillRect(0, 0, 32, 1).fillRect(0, 0, 1, 32);
    g.fillStyle(0x6a5a30).fillRect(4, 10, 9, 1).fillRect(12, 11, 6, 1).fillRect(20, 23, 8, 1);
    g.fillStyle(0xffe08a).fillRect(0, 0, 2, 2);
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
