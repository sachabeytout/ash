import Phaser from 'phaser';
import { mainValue, type OwnedBoon } from '../../core/boons/boons';
import { getBoon, slotOf, type Rarity } from '../../data/boons';
import { GODS } from '../../data/gods';
import { t, type TextKey } from '../../i18n';
import { drawGodIcon } from '../icons';
import { COLORS, FONT_FAMILY } from '../theme';

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#d6cfe6',
  rare: '#6fc3ff',
  epic: '#e08cff',
  duo: '#ffd36b',
  amp: '#7fffc0',
};

/**
 * Petite carte d'un don possédé (pause) : bandeau à la couleur du dieu avec le nom, rareté · action,
 * puis l'effet avec sa valeur actuelle. Le texte est coupé proprement si la carte est petite.
 */
export function addBoonMiniCard(
  scene: Phaser.Scene,
  owned: OwnedBoon,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const def = getBoon(owned.id);
  if (!def) return;
  const gods = def.gods.map((id) => GODS[id]);
  const color = gods[0]?.color ?? 0xffffff;
  const band = 18;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.panel, 0.96).fillRect(x, y, w, h);
  gods.forEach((god, i) => {
    const bw = w / gods.length;
    g.fillStyle(god.color, 0.22).fillRect(x + i * bw, y, bw, band);
  });
  g.lineStyle(1.5, COLORS.goldDim, 0.8).strokeRect(x, y, w, h);
  g.lineStyle(1, color, 0.6).strokeRect(x + 2, y + 2, w - 4, h - 4);
  gods.forEach((god, i) => drawGodIcon(g, god, x + 11 + i * 14, y + band / 2, 5));
  const iconsW = 6 + gods.length * 14;
  scene.add
    .text(x + iconsW, y + band / 2, t(def.nameKey as TextKey), {
      fontFamily: FONT_FAMILY,
      fontSize: '10px',
      fontStyle: 'bold',
      color: COLORS.text,
    })
    .setOrigin(0, 0.5);
  scene.add.text(
    x + 6,
    y + band + 2,
    `${t(`rarity.${owned.rarity}` as TextKey)} · ${t(`slot.${slotOf(def.effect)}` as TextKey)}`,
    { fontFamily: FONT_FAMILY, fontSize: '8px', color: RARITY_COLOR[owned.rarity] },
  );
  const lineH = 11;
  const descY = y + band + 13;
  scene.add.text(
    x + 6,
    descY,
    t(def.descKey as TextKey, { value: mainValue(def.effect, owned.rarity) }),
    {
      fontFamily: FONT_FAMILY,
      fontSize: '9px',
      color: COLORS.text,
      wordWrap: { width: w - 12 },
      lineSpacing: 1,
      maxLines: Math.max(1, Math.floor((y + h - descY - 2) / lineH)),
    },
  );
}
