import Phaser from 'phaser';
import { drawCartoucheRect, drawFrame } from './frame';
import { chosenWeapon, forgeLevel, isUnlocked } from '../../core/forge';
import type { MetaState } from '../../core/save/schema';
import { UNLOCK_COST } from '../../data/forge';
import { DAWNBLADE_VICTORIES } from '../../data/story';
import { WEAPON_ORDER, WEAPONS, type WeaponId } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { drawWeaponGlyph } from '../icons';
import { sfx } from '../audio/sfx';
import { COLORS, FONT_FAMILY } from '../theme';

const DEPART_COLOR = 0xffb02e;
const LOCKED_COLOR = 0x3a3550;

/**
 * Fenêtre de départ (retour F10) : en touchant « Sortir », on choisit l'arme de l'évasion.
 * L'arme de la dernière run est déjà choisie ; « Partir » (ou Entrée, ou toucher la carte choisie)
 * lance la run. Les armes verrouillées sont grisées : elles se débloquent chez Ptah.
 */
export class DeparturePanel {
  private readonly root: Phaser.GameObjects.Container;
  private selected: WeaponId;
  private done = false;
  /** Bouton A de la manette tenu à l'ouverture : il faut le relâcher avant qu'il compte. */
  private pad = { a: true, b: true, left: true, right: true };
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') this.close();
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') this.go();
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.step(1);
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.step(-1);
    else {
      const digit = Number(/^Digit([1-7])$/.exec(e.code)?.[1] ?? 0);
      const id = WEAPON_ORDER[digit - 1];
      if (id) this.select(id);
    }
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly meta: MetaState,
    private readonly onGo: (weapon: WeaponId) => void,
    private readonly onClose: () => void,
    preselect?: WeaponId,
  ) {
    this.selected = preselect && isUnlocked(meta, preselect) ? preselect : chosenWeapon(meta);
    this.root = scene.add.container(0, 0).setDepth(100);
    this.build();
    // Ajouté au tour suivant : l'appui qui a ouvert la fenêtre ne lance pas la run.
    setTimeout(() => {
      if (!this.done) window.addEventListener('keydown', this.onKey);
    }, 0);
  }

  /** Manette (appelé à chaque image par la Cage) : A part, B revient, gauche/droite choisissent. */
  pollPad(): void {
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    if (!pad) return;
    const now = {
      a: pad.buttons[0]?.pressed ?? false,
      b: pad.buttons[1]?.pressed ?? false,
      left: (pad.buttons[14]?.pressed ?? false) || (pad.axes[0] ?? 0) < -0.5,
      right: (pad.buttons[15]?.pressed ?? false) || (pad.axes[0] ?? 0) > 0.5,
    };
    const prev = this.pad;
    this.pad = now;
    if (now.a && !prev.a) this.go();
    else if (now.b && !prev.b) this.close();
    else if (now.left && !prev.left) this.step(-1);
    else if (now.right && !prev.right) this.step(1);
  }

  private build(): void {
    this.root.removeAll(true);
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const w = Math.min(600, cam.displayWidth - 24);
    const h = 340;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const veil = scene.add
      .rectangle(cx, cy, cam.displayWidth + 40, cam.displayHeight + 40, 0x07060d, 0.85)
      .setInteractive(); // bloque les touches sur la Cage derrière
    const frame = scene.add.graphics();
    drawFrame(frame, left, top, w, h, DEPART_COLOR, 0.98);
    this.root.add([veil, frame]);
    this.text(left + 14, top + 10, t('depart.title'), 15, '#ffb02e', true);
    this.text(left + 14, top + 30, t('depart.intro'), 10, COLORS.textDim);

    const cardW = (w - 28 - 3 * 8) / 4;
    const cardH = 78;
    WEAPON_ORDER.forEach((id, i) => {
      const row = i < 4 ? 0 : 1;
      const col = row === 0 ? i : i - 4 + 0.5;
      const x = left + 14 + col * (cardW + 8);
      const y = top + 48 + row * (cardH + 8);
      this.card(id, i, x, y, cardW, cardH);
    });
    this.describe(left + 14, top + 220, w - 28, 78);

    // Boutons du bas : Retour à gauche, Partir à droite (le plus visible).
    const by = top + h - 22;
    this.button(left + 14 + 60, by, 120, t('depart.back'), 0x6b4cff, false, () => this.close());
    this.button(left + w - 14 - 80, by, 160, t('depart.go'), DEPART_COLOR, true, () => this.go());
    this.text(cx, by, t('depart.keys'), 9, COLORS.textDim).setOrigin(0.5);
  }

  private card(id: WeaponId, index: number, x: number, y: number, w: number, h: number): void {
    const def = WEAPONS[id];
    const unlocked = isUnlocked(this.meta, id);
    const selected = id === this.selected;
    const cx = x + w / 2;
    const g = this.scene.add.graphics();
    this.root.add(g);
    g.fillStyle(selected ? 0x241a0a : 0x07060d, 1).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(selected ? 3 : 1.5, unlocked ? def.color : LOCKED_COLOR, unlocked ? 1 : 0.8);
    g.strokeRoundedRect(x, y, w, h, 8);
    if (selected)
      g.lineStyle(1, DEPART_COLOR, 0.6).strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 10);
    const zone = this.scene.add
      .zone(cx, y + h / 2, w, h)
      .setInteractive({ useHandCursor: unlocked });
    // Toucher une arme la choisit ; toucher l'arme déjà choisie lance la run.
    zone.on('pointerup', () => (id === this.selected ? this.go() : this.select(id)));

    // Arme secrète (Lame de l'Aube) : rien n'est dévoilé, pas même son nom.
    if (!unlocked && UNLOCK_COST[id] === undefined) {
      this.text(cx, y + h / 2 - 10, '?', 24, COLORS.textDim, true).setOrigin(0.5);
      this.text(
        cx,
        y + h - 18,
        t('depart.lockedDawn', { count: DAWNBLADE_VICTORIES }),
        9,
        COLORS.textDim,
      )
        .setOrigin(0.5, 0)
        .setWordWrapWidth(w - 10)
        .setAlign('center');
      this.root.add(zone);
      return;
    }

    // Nom, et niveau de forge en petit en haut à droite du nom (mise en page du retour F15).
    const name = this.text(
      cx,
      y + 6,
      t(def.nameKey as TextKey),
      11,
      unlocked ? COLORS.text : COLORS.textDim,
      true,
    ).setOrigin(0.5, 0);
    // Un nom long rapetisse pour tenir sur une ligne (place laissée au niveau).
    for (let size = 10; name.width > w - 24 && size >= 8; size--) name.setFontSize(size);
    const level = forgeLevel(this.meta, id);
    if (unlocked && level > 0)
      this.text(cx + name.width / 2 + 1, y + 3, String(level), 9, '#ffe08a', true);

    const glyph = this.scene.add.graphics().setAlpha(unlocked ? 1 : 0.35);
    drawWeaponGlyph(glyph, id, cx, y + 40, unlocked ? def.color : 0x8a84a0, 0.8);
    this.root.add(glyph);

    const cost = UNLOCK_COST[id] ?? 0;
    const status = !unlocked
      ? t('depart.locked', { cost })
      : selected
        ? t('depart.selected')
        : t('depart.key', { key: index + 1 });
    this.text(cx, y + h - 16, status, 9, selected ? '#ffb02e' : COLORS.textDim, selected)
      .setOrigin(0.5, 0)
      .setWordWrapWidth(w - 10)
      .setAlign('center');
    this.root.add(zone);
  }

  /**
   * Bandeau sous les cartes (retour F15) : l'arme choisie, son niveau, son type et son origine,
   * puis une anecdote ou une rumeur.
   */
  private describe(x: number, y: number, w: number, h: number): void {
    const id = this.selected;
    const def = WEAPONS[id];
    const g = this.scene.add.graphics();
    g.fillStyle(0x07060d, 0.95).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(1.5, def.color, 0.6).strokeRoundedRect(x, y, w, h, 8);
    this.root.add(g);
    const color = `#${def.color.toString(16).padStart(6, '0')}`;
    const name = this.text(x + 12, y + 8, t(def.nameKey as TextKey), 13, color, true);
    const level = forgeLevel(this.meta, id);
    if (level > 0) this.text(x + 12 + name.width + 1, y + 5, String(level), 10, '#ffe08a', true);
    this.text(x + 12, y + 27, t(`weapon.${id}.type` as TextKey), 10, '#d8b878').setFontStyle(
      'italic',
    );
    this.text(x + 12, y + 44, t(`weapon.${id}.rumor` as TextKey), 10, COLORS.text)
      .setWordWrapWidth(w - 24)
      .setLineSpacing(2);
  }

  private button(
    x: number,
    y: number,
    w: number,
    label: string,
    color: number,
    strong: boolean,
    onTap: () => void,
  ): void {
    const g = this.scene.add.graphics();
    drawCartoucheRect(g, x - w / 2, y - 12, w, 24, color);
    this.root.add(g);
    this.text(x, y, label, strong ? 13 : 11, COLORS.text, strong).setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, w, 30).setInteractive({ useHandCursor: true });
    zone.on('pointerup', onTap);
    this.root.add(zone);
  }

  /** Arme suivante ou précédente parmi celles débloquées. */
  private step(dir: 1 | -1): void {
    const open = WEAPON_ORDER.filter((id) => isUnlocked(this.meta, id));
    const i = open.indexOf(this.selected);
    const next = open[(i + dir + open.length) % open.length];
    if (next) this.select(next);
  }

  private select(id: WeaponId): void {
    // Arme verrouillée : on ne peut pas la prendre (elle se débloque chez Ptah).
    if (this.done || id === this.selected || !isUnlocked(this.meta, id)) return;
    this.selected = id;
    sfx.tap();
    this.build();
  }

  private go(): void {
    if (this.done) return;
    sfx.boonTaken();
    this.destroy();
    this.onGo(this.selected);
  }

  private text(x: number, y: number, value: string, size: number, color: string, bold = false) {
    const obj = this.scene.add.text(x, y, value, {
      fontFamily: FONT_FAMILY,
      fontSize: `${size}px`,
      fontStyle: bold ? 'bold' : 'normal',
      color,
    });
    this.root.add(obj);
    return obj;
  }

  private destroy(): void {
    this.done = true;
    window.removeEventListener('keydown', this.onKey);
    this.root.destroy(true);
  }

  close(): void {
    if (this.done) return;
    sfx.tap();
    this.destroy();
    this.onClose();
  }
}
