import Phaser from 'phaser';
import { mainValue, type OwnedBoon } from '../../core/boons/boons';
import { getBoon, slotOf, type Rarity } from '../../data/boons';
import { GODS } from '../../data/gods';
import { t, type TextKey } from '../../i18n';
import { drawGodIcon } from '../icons';
import { COLORS, FONT_FAMILY } from '../theme';
import { settings } from '../../core/settings';
import { scaledFontSize } from '../../core/textScale';
import { sfx } from '../audio/sfx';
import { frieze } from './frame';

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#d6cfe6',
  rare: '#6fc3ff',
  epic: '#e08cff',
  duo: '#ffd36b',
};

/** Réduit la police d'un texte (jusqu'à `minPx`) pour qu'il tienne dans `maxW` (taille du texte respectée). */
function fitWidth(text: Phaser.GameObjects.Text, basePx: number, maxW: number, minPx = 7): void {
  for (let px = basePx; text.width > maxW && px > minPx; px--)
    text.setFontSize(scaledFontSize(px - 1, settings.textSize) ?? px - 1);
}

/**
 * Dons obtenus (pause, retour F5 option D) : une grille compacte (icône + nom en entier) et, à
 * droite, le détail complet du don touché (nom, rareté · action, description entière).
 * Flèches haut/bas : don précédent / suivant.
 */
export function addBoonList(
  scene: Phaser.Scene,
  boons: readonly OwnedBoon[],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const gap = 6;
  const detailW = Math.max(150, Math.min(210, w * 0.42));
  const gridW = w - detailW - gap;
  const rowH = 22;
  const maxRows = Math.max(1, Math.floor((h + 4) / (rowH + 4)));
  const cols = boons.length > maxRows * 2 ? 3 : boons.length > maxRows ? 2 : 1;
  const rows = Math.ceil(boons.length / cols);
  const chipH = Math.min(rowH, (h - 4 * (rows - 1)) / rows);
  const chipW = (gridW - 4 * (cols - 1)) / cols;
  let selected = 0;
  const chips: { draw: (on: boolean) => void }[] = [];
  const detail = scene.add.container(0, 0);

  const showDetail = (index: number) => {
    selected = index;
    chips.forEach((c, i) => c.draw(i === index));
    detail.removeAll(true);
    const owned = boons[index];
    const def = owned && getBoon(owned.id);
    if (!owned || !def) return;
    const gods = def.gods.map((id) => GODS[id]);
    const color = gods[0]?.color ?? 0xffffff;
    const dx = x + gridW + gap;
    const band = 26;
    const g = scene.add.graphics();
    g.fillStyle(COLORS.panel, 0.97).fillRect(dx, y, detailW, h);
    gods.forEach((god, i) => {
      const bw = detailW / gods.length;
      g.fillStyle(god.color, 0.25).fillRect(dx + i * bw, y, bw, band);
    });
    frieze(g, dx + 6, y + band - 1, detailW - 12);
    g.lineStyle(1.5, COLORS.goldDim, 0.9).strokeRect(dx, y, detailW, h);
    g.lineStyle(1, color, 0.7).strokeRect(dx + 3, y + 3, detailW - 6, h - 6);
    gods.forEach((god, i) =>
      drawGodIcon(g, god, dx + detailW / 2 + (i - (gods.length - 1) / 2) * 20, y + band / 2, 7),
    );
    const name = scene.add
      .text(dx + detailW / 2, y + band + 8, t(def.nameKey as TextKey), {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        fontStyle: 'bold',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: detailW - 16 },
      })
      .setOrigin(0.5, 0);
    const kind = scene.add
      .text(
        dx + detailW / 2,
        name.y + name.height + 4,
        `${t(`rarity.${owned.rarity}` as TextKey)} · ${t(`slot.${slotOf(def.effect)}` as TextKey)}`,
        { fontFamily: FONT_FAMILY, fontSize: '10px', color: RARITY_COLOR[owned.rarity] },
      )
      .setOrigin(0.5, 0);
    const descTop = kind.y + kind.height + 8;
    const desc = scene.add
      .text(
        dx + detailW / 2,
        descTop,
        t(def.descKey as TextKey, { value: mainValue(def.effect, owned.rarity) }),
        {
          fontFamily: FONT_FAMILY,
          fontSize: '11px',
          color: COLORS.text,
          align: 'center',
          wordWrap: { width: detailW - 18 },
          lineSpacing: 3,
        },
      )
      .setOrigin(0.5, 0);
    // Une description très longue rétrécit plutôt que de sortir du cadre.
    for (let px = 11; desc.y + desc.height > y + h - 8 && px > 8; px--)
      desc.setFontSize(scaledFontSize(px - 1, settings.textSize) ?? px - 1);
    detail.add([g, name, kind, desc]);
  };

  boons.forEach((owned, i) => {
    const def = getBoon(owned.id);
    if (!def) return;
    const gods = def.gods.map((id) => GODS[id]);
    const color = gods[0]?.color ?? 0xffffff;
    const cx = x + (i % cols) * (chipW + 4);
    const cy = y + Math.floor(i / cols) * (chipH + 4);
    const g = scene.add.graphics();
    const draw = (on: boolean) => {
      g.clear();
      g.fillStyle(on ? color : COLORS.panel, on ? 0.25 : 0.95).fillRect(cx, cy, chipW, chipH);
      g.lineStyle(on ? 1.5 : 1, on ? COLORS.gold : color, on ? 1 : 0.6).strokeRect(
        cx,
        cy,
        chipW,
        chipH,
      );
      gods.forEach((god, k) => drawGodIcon(g, god, cx + 9 + k * 12, cy + chipH / 2, 4.5));
    };
    chips[i] = { draw };
    const iconsW = 4 + gods.length * 12;
    const label = scene.add
      .text(cx + iconsW, cy + chipH / 2, t(def.nameKey as TextKey), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        fontStyle: 'bold',
        color:
          RARITY_COLOR[owned.rarity] === RARITY_COLOR.common
            ? COLORS.text
            : RARITY_COLOR[owned.rarity],
      })
      .setOrigin(0, 0.5);
    fitWidth(label, 10, chipW - iconsW - 4);
    scene.add
      .zone(cx + chipW / 2, cy + chipH / 2, chipW, chipH + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (selected !== i) sfx.tap();
        showDetail(i);
      });
  });
  showDetail(0);

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'ArrowDown' || e.code === 'ArrowRight')
      showDetail((selected + 1) % boons.length);
    if (e.code === 'ArrowUp' || e.code === 'ArrowLeft')
      showDetail((selected - 1 + boons.length) % boons.length);
  };
  window.addEventListener('keydown', onKey);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
    window.removeEventListener('keydown', onKey),
  );
}
